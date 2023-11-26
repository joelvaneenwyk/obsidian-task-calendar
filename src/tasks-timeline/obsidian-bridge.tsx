import { Model } from 'backbone';
import moment from 'moment';
import { App, ItemView, Notice, Pos, MarkdownView } from 'obsidian';
import * as React from 'react';
import { UserOption, defaultUserOptions } from 'settings';
import * as TaskMappable from 'utils/task-mappable';
import { TaskDataModel } from 'utils/tasks';
import { QuickEntryHandlerContext, TaskItemEventHandlersContext } from './components/context';
import { TimelineView } from './components/timeline-view';

const defaultObsidianBridgeProps = {
  plugin: {} as ItemView,
  userOptionModel: new Model({ ...defaultUserOptions }) as Model,
  taskListModel: new Model({ taskList: [] as TaskDataModel[] }) as Model
};

const defaultObsidianBridgeState = {
  taskList: [] as TaskDataModel[],
  userOptions: defaultUserOptions as UserOption
};

type ObsidianBridgeProps = Readonly<typeof defaultObsidianBridgeProps>;
type ObsidianBridgeState = typeof defaultObsidianBridgeState;

export class ObsidianBridge extends React.Component<ObsidianBridgeProps, ObsidianBridgeState> {
  private readonly app: App;

  constructor(props: ObsidianBridgeProps) {
    super(props);

    this.app = this.props.plugin.app;

    this.handleCreateNewTask = this.handleCreateNewTask.bind(this);
    this.handleTagClick = this.handleTagClick.bind(this);
    this.handleOpenFile = this.handleOpenFile.bind(this);
    this.handleCompleteTask = this.handleCompleteTask.bind(this);
    this.onUpdateTasks = this.onUpdateTasks.bind(this);
    this.onUpdateUserOption = this.onUpdateUserOption.bind(this);
    this.handleModifyTask = this.handleModifyTask.bind(this);
    this.handleFilterEnable = this.handleFilterEnable.bind(this);

    this.state = {
      userOptions: { ...(this.props.userOptionModel.pick(this.props.userOptionModel.keys()) as UserOption) },
      taskList: this.props.taskListModel.get('taskList')
    };
  }

  componentDidMount(): void {
    this.props.taskListModel.on('change', this.onUpdateTasks);
    this.props.userOptionModel.on('change', this.onUpdateUserOption);
  }

  componentWillUnmount(): void {
    this.props.taskListModel.off('change', this.onUpdateTasks);
    this.props.userOptionModel.off('change', this.onUpdateUserOption);
  }

  onUpdateUserOption() {
    this.setState({
      userOptions: { ...(this.props.userOptionModel.pick(this.props.userOptionModel.keys()) as UserOption) }
    });
  }

  onUpdateTasks() {
    this.setState({
      taskList: this.props.taskListModel.get('taskList')
    });
  }

  handleFilterEnable(startDate: string, endDate: string, priorities: string[]) {
    let taskList: TaskDataModel[] = this.props.taskListModel.get('taskList');

    if (startDate && startDate !== '' && endDate && endDate !== '') {
      taskList = taskList.filter(TaskMappable.filterDateRange(moment(startDate), moment(endDate)));
    }
    if (priorities.length !== 0) {
      taskList = taskList.filter((t: TaskDataModel) => priorities.includes(t.priority));
    }
    this.setState({
      taskList: taskList
    });
  }

  handleCreateNewTask(path: string, append: string) {
    const taskStr = '- [ ] ' + append + '\n';
    const section = this.state.userOptions.sectionForNewTasks;
    this.app.vault.adapter.exists(path).then((exist) => {
      if (!exist && confirm('No such file: ' + path + '. Would you like to create it?')) {
        const content = section + '\n\n' + taskStr;
        this.app.vault
          .create(path, content)
          .then(() => {
            this.onUpdateTasks();
          })
          .catch((reason) => {
            return new Notice('Error when creating file ' + path + ' for new task: ' + reason, 5000);
          });
        return;
      }
      this.app.vault.adapter
        .read(path)
        .then((content) => {
          const lines = content.split('\n');
          lines.splice(lines.indexOf(section) + 1, 0, taskStr);
          this.app.vault.adapter
            .write(path, lines.join('\n'))
            .then(() => {
              this.onUpdateTasks();
            })
            .catch((reason) => {
              return new Notice(`Error when writing new tasks to ${reason}.`, 5000);
            });
        })
        .catch((reason) => new Notice('Error when reading file ' + path + '.' + reason, 5000));
    });
  }

  handleTagClick(tag: string) {
    const searchPlugin = this.app.internalPlugins.getPluginById('global-search');
    if (searchPlugin?.instance?.openGlobalSearch) {
      searchPlugin.instance.openGlobalSearch('tag:' + tag);
    }
  }

  handleOpenFile(path: string, position: Pos, openTaskEdit = false) {
    this.app.vault.adapter
      .exists(path)
      .then((exist) => {
        if (!exist) {
          new Notice('No such file: ' + path, 5000);
          return;
        }
        this.app.workspace.openLinkText('', path).then(() => {
          try {
            const file = this.app.workspace.getActiveFile();
            this.app.workspace.getLeaf().openFile(file!, { state: { mode: 'source' } });
            this.app.workspace.activeEditor?.editor?.setSelection(
              { line: position.start.line, ch: position.start.col },
              { line: position.end.line, ch: position.end.col }
            );
            if (!this.app.workspace.activeEditor?.editor?.hasFocus()) this.app.workspace.activeEditor?.editor?.focus();
            if (openTaskEdit) {
              const editor = this.app.workspace.activeEditor?.editor;
              if (editor) {
                const view = this.app.workspace.getLeaf().view as MarkdownView;
                const command = this.app.commands.commands['obsidian-tasks-plugin:edit-task'];
                if (command && command.editorCheckCallback) {
                  command.editorCheckCallback(false, editor, view);
                }
              }
            }
          } catch (err) {
            new Notice(`Error when trying open file: ${err}`, 5000);
          }
        });
      })
      .catch((reason) => {
        new Notice('Something went wrong: ' + reason, 5000);
      });
  }

  handleModifyTask(path: string, position: Pos) {
    this.handleOpenFile(path, position, true);
  }

  handleCompleteTask(path: string, position: Pos) {
    this.app.workspace.openLinkText('', path).then(() => {
      const file = this.app.workspace.getActiveFile();
      this.app.workspace.getLeaf().openFile(file!, { state: { mode: 'source' } });
      this.app.workspace.activeEditor?.editor?.setSelection(
        { line: position.start.line, ch: position.start.col },
        { line: position.end.line, ch: position.end.col }
      );
      if (!this.app.workspace.activeEditor?.editor?.hasFocus()) this.app.workspace.activeEditor?.editor?.focus();
      const editor = this.app.workspace.activeEditor?.editor;
      if (editor) {
        const view = this.app.workspace.getLeaf().view as MarkdownView;
        const command = this.app.commands.commands['obsidian-tasks-plugin:toggle-done'];
        if (command !== undefined && command.editorCheckCallback !== undefined) {
          command.editorCheckCallback(false, editor, view);
        }
      }
    });
  }

  render(): React.ReactNode {
    return (
      <QuickEntryHandlerContext.Provider
        value={{
          handleCreateNewTask: this.handleCreateNewTask,
          handleFilterEnable: this.handleFilterEnable
        }}
      >
        <TaskItemEventHandlersContext.Provider
          value={{
            handleOpenFile: this.handleOpenFile,
            handleCompleteTask: this.handleCompleteTask,
            handleTagClick: this.handleTagClick,
            handleModifyTask:
              this.app.plugins.plugins['obsidian-tasks-plugin'] === undefined ? undefined : this.handleModifyTask
          }}
        >
          <TimelineView userOptions={this.state.userOptions} taskList={this.state.taskList} />
        </TaskItemEventHandlersContext.Provider>
      </QuickEntryHandlerContext.Provider>
    );
  }
}
