import { Plugin } from 'obsidian';

import { TasksTimelineView, TIMELINE_VIEW } from './views';

import { TasksCalendarSettingTab, UserOption, UserOptions } from './settings';
// Remember to rename these classes and interfaces!

export default class TasksCalendarWrapper extends Plugin {
  userOptions: UserOptions = new UserOptions();

  public get tasksTimelineView(): TasksTimelineView | null {
    for (const leaf of this.app.workspace.getLeavesOfType(TIMELINE_VIEW)) {
      if (leaf.view instanceof TasksTimelineView) {
        return leaf.view;
      }
    }
    return null;
  }

  async onload() {
    await this.loadOptions();
    this.registerView(TIMELINE_VIEW, (leaf) => new TasksTimelineView(leaf));

    this.app.workspace.onLayoutReady(() => this.activateView(TIMELINE_VIEW));

    await this.tasksTimelineView?.onUpdateOptions(this.userOptions);

    // This adds a simple command that can be triggered anywhere\
    this.addCommand({
      id: 'open-tasks-timeline-view',
      name: 'Open Tasks Timeline View',
      callback: () => this.activateView(TIMELINE_VIEW)
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new TasksCalendarSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(TIMELINE_VIEW);
  }

  private async updateOptions(updatedOpts: Partial<UserOption>) {
    this.userOptions.set(updatedOpts);
    await this.tasksTimelineView?.onUpdateOptions(this.userOptions);
  }

  async loadOptions(): Promise<void> {
    await this.updateOptions((await this.loadData()) as UserOption);
  }

  async writeOptions(changedOpts: Partial<UserOption>): Promise<void> {
    await this.updateOptions(changedOpts);
    await this.saveData(this.userOptions.data);
  }

  async activateView(type: string) {
    if (type === TIMELINE_VIEW) {
      this.app.workspace.detachLeavesOfType(type);
      try {
        await this.app.workspace.getRightLeaf(false).setViewState({
          type: type,
          active: true
        });

        this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(type).first()!);
      } catch (e) {
        console.log(`[task-calendar] Failed to active view. ${e}`);
      }
    }
  }
}
