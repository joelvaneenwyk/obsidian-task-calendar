import { Model } from 'backbone';
import { ItemView, Notice, WorkspaceLeaf } from 'obsidian';
import { ObsidianBridge } from 'tasks-timeline/obsidian-bridge';
import { ObsidianTaskAdapter } from 'tasks-timeline/task-adapter';
import { createRoot, Root } from 'react-dom/client';
import { TaskDataModel } from 'utils/tasks';
import { defaultUserOptions, UserOption } from './settings';

export const CALENDAR_VIEW = 'tasks_calendar_view';
export const TIMELINE_VIEW = 'tasks_timeline_view';

export abstract class BaseTasksView extends ItemView {
  protected root?: Root;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }
}

export class TasksTimelineView extends BaseTasksView {
  private taskListModel = new Model({
    taskList: [] as TaskDataModel[]
  });
  private userOptionModel = new Model({ ...defaultUserOptions });
  private _taskAdapter: ObsidianTaskAdapter;
  private static _activeTasksTimelineView?: TasksTimelineView;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);

    TasksTimelineView._activeTasksTimelineView = this;
    this.onReloadTasks = this.onReloadTasks.bind(this);
    this.onUpdateOptions = this.onUpdateOptions.bind(this);

    this._taskAdapter = new ObsidianTaskAdapter(this.app);
  }

  public static getActiveView(): TasksTimelineView | undefined {
    return TasksTimelineView._activeTasksTimelineView;
  }

  protected async onOpen() {
    this.registerEvent(this.app.metadataCache.on('resolved', this.onReloadTasks));
    this.registerEvent(this.app.workspace.on('window-open', this.onReloadTasks));

    const { containerEl } = this;
    const container = containerEl.children[1];

    container.empty();
    this.root = createRoot(container);
    this.root.render(
      <ObsidianBridge plugin={this} userOptionModel={this.userOptionModel} taskListModel={this.taskListModel} />
    );
  }

  protected async onClose() {
    this.app.metadataCache.off('resolved', this.onReloadTasks);
    this.app.workspace.off('window-open', this.onReloadTasks);
  }

  public async onUpdateOptions(opt: UserOption) {
    this.userOptionModel.clear();
    this.userOptionModel.set({ ...opt });
    await this.onReloadTasks();
  }

  public get fileIncludeFilter(): string[] {
    return this.userOptionModel.get('includePaths') || [];
  }

  public get fileExcludeFilter(): string[] {
    return this.userOptionModel.get('excludePaths') || [];
  }

  public get fileIncludeTagsFilter(): string[] {
    return this.userOptionModel.get('fileIncludeTags') || [];
  }

  public get fileExcludeTagsFilter(): string[] {
    return this.userOptionModel.get('fileExcludeTags') || [];
  }

  private get options(): Partial<UserOption> {
    return {
      dailyNoteFormat: this.userOptionModel.get('dailyNoteFormat'),
      filterEmpty: this.userOptionModel.get('filterEmpty'),
      forward: this.userOptionModel.get('forward'),
      hideStatusTasks: this.userOptionModel.get('hideStatusTasks'),
      sort: this.userOptionModel.get('sort'),
      taskStatusOrder: this.userOptionModel.get('taskStatusOrder'),
      taskExcludeTags: this.userOptionModel.get('taskExcludeTags'),
      taskIncludeTags: this.userOptionModel.get('taskIncludeTags'),
      useExcludeTags: this.userOptionModel.get('useExcludeTags'),
      useIncludeTags: this.userOptionModel.get('useIncludeTags')
    };
  }

  /**
   * Reload/recreated tasks.
   *
   * NOTE: This was modified from original at https://github.com/Leonezz/obsidian-tasks-calendar-wrapper/blob/master/src/views.tsx
   */
  public async onReloadTasks() {
    try {
      const tasks = await this._taskAdapter.setTasks(
        this.fileIncludeFilter,
        this.fileExcludeFilter,
        this.fileIncludeTagsFilter,
        this.fileExcludeTagsFilter,
        this.options
      );

      if (tasks.length > 0) {
        this.taskListModel.set({ taskList: this._taskAdapter.tasks });
        this.userOptionModel.set({ taskFiles: this._taskAdapter.files });
        console.log(
          `Generated and parsed '${tasks.length}' calendar tasks. Total tasks: '${this._taskAdapter.tasks.length}'`
        );
      }
    } catch (error) {
      new Notice(`Error when generating tasks from files: ${error}`, 5000);
    }
  }

  getViewType(): string {
    return TIMELINE_VIEW;
  }

  getDisplayText(): string {
    return '';
  }

  getIcon(): string {
    return 'calendar-clock';
  }
}
