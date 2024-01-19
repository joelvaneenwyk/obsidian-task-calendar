import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TaskRegularExpressions } from 'utils/tasks';
import TasksCalendarWrapper from './main';

const sortOptions = {
  '(t1, t2) => t1.order <= t2.order ? -1 : 1': 'status(ascending)',
  '(t1, t2) => t1.order >= t2.order ? -1 : 1': 'status(descending)',
  '(t1, t2) => t1.visual.trim() <= t2.visual.trim() ? -1 : 1': 'text(ascending)',
  '(t1, t2) => t1.visual.trim() >= t2.visual.trim() ? -1 : 1': 'text(descending)',
  '(t1, t2) => t1.start <= t2.start ? -1 : 1': 'start time(ascending)',
  '(t1, t2) => t1.start >= t2.start ? -1 : 1': 'start time(descending)',
  '(t1, t2) => t1.due <= t2.due ? -1 : 1': 'due time(ascending)',
  '(t1, t2) => t1.due >= t2.due ? -1 : 1': 'due time(descending)',
  '(t1, t2) => t1.tags <= t2.tags ? -1 : 1': 'tags(ascending)',
  '(t1, t2) => t1.tags >= t2.tags ? -1 : 1': 'tags(descending)'
};

export interface UserOption {
  /**
   * filter empty items out or not, if not, the raw text of empty items will be displayed
   */
  filterEmpty: boolean;

  /**
   * Include tasks match specific paths (folders, files)
   */
  includePaths: string[];

  /**
   * Exclude tasks match specific paths (folders, files)
   */
  excludePaths: string[];

  /**
   * filter specific files and tasks only from these files are rendered */
  fileFilter: string;

  /**
   * Use tags filters to filter tasks without specific tags out or not.
   */
  useIncludeTags: boolean;

  /**
   * Filter tasks with specific tags, only tasks with one or more of these tags are displayed.
   */
  taskIncludeTags: string[];

  /**
   * Filter tasks in specific files which contains one or more of these tags to be displayed.
   */
  fileIncludeTags: string[];

  /**
   * Use tags filters to filters tasks with specific tags out or not.
   */
  useExcludeTags: boolean;

  /**
   * Filter tasks without specific tags, only tasks **without any** if these tags are displayed.
   */
  taskExcludeTags: string[];

  /**
   * Filter tasks in specific files which **does not** contains any of these tags to be displayed.
   */
  fileExcludeTags: string[];

  /**
   * optional options to customize the look */
  styles: string[];

  /**
   * specify the folder where the daily notes are saved */
  dailyNoteFolder: string;

  /**
   * daily note file format */
  dailyNoteFormat: string;

  /**
   * specify under which section the new task items should be appended.  */
  sectionForNewTasks: string;

  /**
   * specify which tags are not necessary to display with a tag badge,
   * note that all tag texts are remove from the displayed item text by default. */
  hideTags: string[];

  /**
   * Forward tasks from the past and display them on the today panel or not
   */
  forward: boolean;

  /**
   * Specify how do you like the task item to be sorted, it must be a valid lambda
   */
  sort: string;

  /**
   * Specify task status order
   * TODO
   */
  taskStatusOrder: string[];

  /**
   * Specify in what format do you like the dates to be displayed.
   */
  dateFormat: string;

  /**
   * Specify in which file do you like to append new task items to by default.
   * Tasks from this file will be displayed under today panel and labeled inbox by default.
   */
  inbox: string;

  /**
   * Specify which files do you like to be displayed in the file select by default.
   * If left blank, all files where there are task items will be displayed.
   */
  taskFiles: string[];

  /**
   * Specify a color palette for tags.
   * Note that this will override other color setting for tags.
   */
  tagColorPalette: Record<string, string>;

  /**
   * Use counters on the today panel or not
   */
  useCounters: boolean;

  /**
   * Default behavior for filter buttons,
   * Focus to make items more clear or
   * Filter others out.
   */
  counterBehavior: 'Filter' | 'Focus';

  /**
   * Use quick entry panel on the today panel or not
   */

  useQuickEntry: boolean;

  /**
   * Where to put the entry panel,
   * Top means on top of the view,
   * Bottom means on bottom of the view,
   * Today means in today's view.
   */
  entryPosition: 'today' | 'top' | 'bottom';

  /**
   * Display which year it is or not.
   */
  useYearHeader: boolean;

  /**
   * USE INFO BEGIN
   */
  /**
   * Use relative dates to describe the task dates or not.
   */
  useRelative: boolean;

  /**
   * Display recurrence information of tasks or not.
   */
  useRecurrence: boolean;

  /**
   * Display priority information of tasks or not.
   */
  usePriority: boolean;

  /**
   * Display tags of tasks or not.
   */
  useTags: boolean;

  /**
   * Display which file the task is from or not.
   */
  useFileBadge: boolean;

  /**
   * Display which section the task is from or not.
   */
  useSection: boolean;

  /**
   * USE INFO END
   */
  /**
   * hide specific status of tasks.
   */
  hideStatusTasks: string[];

  /**
   * Activate today focus on load or not.
   */
  defaultTodayFocus: boolean;

  /**
   * Activate a filter or not.
   */
  defaultFilters: string;

  /**
   * Use builtin style (status icons) or not.
   * If disabled, icons defined by the theme will be used.
   */
  useBuiltinStyle: boolean;
}

export type PartialUserOption = Partial<UserOption>;

export class UserOptions implements UserOption {
  /**
   * filter empty items out or not, if not, the raw text of empty items will be displayed
   */
  public filterEmpty: boolean = true;

  /**
   * Include tasks match specific paths (folders, files)
   */
  public get includePaths(): string[] {
    return [...this._includePaths];
  }
  public _includePaths: string[] = [];

  /**
   * Exclude tasks match specific paths (folders, files)
   */
  public get excludePaths(): string[] {
    return [...this._excludePaths];
  }
  public _excludePaths: string[] = [];

  /**
   * filter specific files and tasks only from these files are rendered */
  public fileFilter: string = '';

  /**
   * Use tags filters to filter tasks without specific tags out or not.
   */
  public useIncludeTags: boolean = false;

  /**
   * Filter tasks with specific tags, only tasks with one or more of these tags are displayed.
   */
  public get taskIncludeTags(): string[] {
    return [...this._taskIncludeTags];
  }
  public _taskIncludeTags: string[] = [];

  /**
   * Filter tasks in specific files which contains one or more of these tags to be displayed.
   */
  public get fileIncludeTags(): string[] {
    return [...this._fileIncludeTags];
  }
  public _fileIncludeTags: string[] = [];

  /**
   * Use tags filters to filters tasks with specific tags out or not.
   */
  public useExcludeTags: boolean = false;

  /**
   * Filter tasks without specific tags, only tasks **without any** if these tags are displayed.
   */
  public get taskExcludeTags(): string[] {
    return [...this._taskExcludeTags];
  }
  public _taskExcludeTags: string[] = [];

  /**
   * Filter tasks in specific files which **does not** contains any of these tags to be displayed.
   */
  public get fileExcludeTags(): string[] {
    return [...this._fileExcludeTags];
  }
  public _fileExcludeTags: string[] = [];

  /**
   * optional options to customize the look */
  public get styles(): string[] {
    return [...this._styles];
  }
  public _styles: string[] = ['style1'];

  /**
   * specify the folder where the daily notes are saved */
  public dailyNoteFolder: string = '';

  /**
   * daily note file format */
  public dailyNoteFormat: string = 'YYYY-MM-DD';

  /**
   * specify under which section the new task items should be appended.  */
  public sectionForNewTasks: string = '## Tasks';

  /**
   * specify which tags are not necessary to display with a tag badge,
   * note that all tag texts are remove from the displayed item text by default. */
  public get hideTags(): string[] {
    return [...this._hideTags];
  }
  public _hideTags: string[] = [];

  /**
   * Forward tasks from the past and display them on the today panel or not
   */
  public forward: boolean = true;

  /**
   * Specify how do you like the task item to be sorted, it must be a valid lambda
   */
  public sort: string = '(t1, t2) => t1.order <= t2.order ? -1 : 1';

  /**
   * Specify task status order
   * TODO
   */
  public get taskStatusOrder(): string[] {
    return [...this._taskStatusOrder];
  }
  public _taskStatusOrder: string[] = [
    'overdue',
    'due',
    'scheduled',
    'start',
    'process',
    'unplanned',
    'done',
    'cancelled'
  ];

  /**
   * Specify in what format do you like the dates to be displayed.
   */
  public dateFormat: string = 'dddd, MMM, D';

  /**
   * Specify in which file do you like to append new task items to by default.
   * Tasks from this file will be displayed under today panel and labeled inbox by default.
   */
  public inbox: string = 'Inbox.md';

  /**
   * Specify which files do you like to be displayed in the file select by default.
   * If left blank, all files where there are task items will be displayed.
   */
  public get taskFiles(): string[] {
    return [...this._taskFiles];
  }
  public _taskFiles: string[] = [];

  /**
   * Specify a color palette for tags.
   * Note that this will override other color setting for tags.
   */
  public get tagColorPalette(): Record<string, string> {
    return this._tagColorPalette;
  }
  public _tagColorPalette: Record<string, string> = { '#TODO': '#339988', '#TEST': '#998877' };

  /**
   * Use counters on the today panel or not
   */
  public useCounters: boolean = true;

  /**
   * Default behavior for filter buttons,
   * Focus to make items more clear or
   * Filter others out.
   */
  public counterBehavior: 'Filter' | 'Focus' = 'Filter';

  /**
   * Use quick entry panel on the today panel or not
   */

  public useQuickEntry: boolean = true;

  /**
   * Where to put the entry panel,
   * Top means on top of the view,
   * Bottom means on bottom of the view,
   * Today means in today's view.
   */
  public entryPosition: 'today' | 'top' | 'bottom' = 'today';

  /**
   * Display which year it is or not.
   */
  public useYearHeader: boolean = true;

  /**
   * USE INFO BEGIN
   */
  /**
   * Use relative dates to describe the task dates or not.
   */
  public useRelative: boolean = true;

  /**
   * Display recurrence information of tasks or not.
   */
  public useRecurrence: boolean = true;

  /**
   * Display priority information of tasks or not.
   */
  public usePriority: boolean = true;

  /**
   * Display tags of tasks or not.
   */
  public useTags: boolean = true;

  /**
   * Display which file the task is from or not.
   */
  public useFileBadge: boolean = true;

  /**
   * Display which section the task is from or not.
   */
  public useSection: boolean = true;

  /**
   * USE INFO END
   */
  /**
   * hide specific status of tasks.
   */
  public get hideStatusTasks(): string[] {
    return [...this._hideStatusTasks];
  }
  public _hideStatusTasks: string[] = ['x', '-'];

  /**
   * Activate today focus on load or not.
   */
  public defaultTodayFocus: boolean = false;

  /**
   * Activate a filter or not.
   */
  public defaultFilters: string = '';

  /**
   * Use builtin style (status icons) or not.
   * If disabled, icons defined by the theme will be used.
   */
  public useBuiltinStyle: boolean = true;

  public constructor() {}

  public get data() {
    return Object.assign({}, this);
  }

  public set(settings: PartialUserOption): UserOptions {
    this.filterEmpty = settings.filterEmpty ?? this.filterEmpty;
    this.fileFilter = settings.fileFilter ?? this.fileFilter;
    this.useIncludeTags = settings.useIncludeTags ?? this.useIncludeTags;
    this.useExcludeTags = settings.useExcludeTags ?? this.useExcludeTags;
    this.dailyNoteFolder = settings.dailyNoteFolder ?? this.dailyNoteFolder;
    this.dailyNoteFormat = settings.dailyNoteFormat ?? this.dailyNoteFormat;
    this.sectionForNewTasks = settings.sectionForNewTasks ?? this.sectionForNewTasks;
    this.forward = settings.forward ?? this.forward;
    this.sort = settings.sort ?? this.sort;
    this.dateFormat = settings.dateFormat ?? this.dateFormat;
    this.inbox = settings.inbox ?? this.inbox;
    this.useCounters = settings.useCounters ?? this.useCounters;
    this.counterBehavior = settings.counterBehavior ?? this.counterBehavior;
    this.useQuickEntry = settings.useQuickEntry ?? this.useQuickEntry;
    this.entryPosition = settings.entryPosition ?? this.entryPosition;
    this.useYearHeader = settings.useYearHeader ?? this.useYearHeader;
    this.useRelative = settings.useRelative ?? this.useRelative;
    this.useRecurrence = settings.useRecurrence ?? this.useRecurrence;
    this.usePriority = settings.usePriority ?? this.usePriority;
    this.useTags = settings.useTags ?? this.useTags;
    this.useFileBadge = settings.useFileBadge ?? this.useFileBadge;
    this.useSection = settings.useSection ?? this.useSection;
    this.defaultTodayFocus = settings.defaultTodayFocus ?? this.defaultTodayFocus;
    this.defaultFilters = settings.defaultFilters ?? this.defaultFilters;
    this.useBuiltinStyle = settings.useBuiltinStyle ?? this.useBuiltinStyle;

    this._hideTags = settings.hideTags ?? this._hideTags;
    this._styles = settings.styles ?? this._styles;
    this._tagColorPalette = settings.tagColorPalette ?? this.tagColorPalette;
    this._taskStatusOrder = settings.taskStatusOrder ?? this._taskStatusOrder;
    this._taskFiles = settings.taskFiles ?? this._taskFiles;
    this._includePaths = settings.includePaths ?? this._includePaths;
    this._excludePaths = settings.excludePaths ?? this._excludePaths;
    this._taskIncludeTags = settings.taskIncludeTags ?? this.taskIncludeTags;
    this._fileIncludeTags = settings.fileIncludeTags ?? this.fileIncludeTags;
    this._taskExcludeTags = settings.taskExcludeTags ?? this._taskExcludeTags;
    this._fileExcludeTags = settings.fileExcludeTags ?? this._fileExcludeTags;
    this._hideStatusTasks = settings.hideStatusTasks ?? this._hideStatusTasks;

    return this;
  }
}

export const defaultUserOptions: UserOption = new UserOptions();

export class TasksCalendarSettingTab extends PluginSettingTab {
  plugin: TasksCalendarWrapper;
  constructor(app: App, plugin: TasksCalendarWrapper) {
    super(app, plugin);
    this.plugin = plugin;
    this.onOptionUpdate = this.onOptionUpdate.bind(this);
    this.tagsSettingItem = this.tagsSettingItem.bind(this);
  }

  private static createFragmentWithHTML = (html: string) =>
    createFragment((documentFragment) => (documentFragment.createDiv().innerHTML = html));

  async onOptionUpdate(updatePart: Partial<UserOption>, refreshSettingPage = false) {
    await this.plugin.writeOptions(updatePart);
    if (refreshSettingPage) {
      this.display();
    }
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h1', { text: 'Timeline Settings' });
    containerEl.createEl('h2', { text: 'UI Settings' });

    new Setting(containerEl)
      .setName('Use Builtin Style')
      .setDesc(
        'Use builtin styles (the marker icons for task status) or not.\n\
                If disabled, styles defined by the theme you are using will be used.'
      )
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useBuiltinStyle);
        tg.onChange(async (v) => this.onOptionUpdate({ useBuiltinStyle: v }));
      });

    new Setting(containerEl)
      .setName('Enable Counters and Filters Panel')
      .setDesc('Use counters and filters on the quick entry panel or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useCounters);
        tg.onChange(async (v) => this.onOptionUpdate({ useCounters: v }));
      });
    new Setting(containerEl)
      .setName('Behavior of Counters and Filters Panel')
      .setDesc(
        'Set the default behavior of the counter and filter buttons.\
                Available choices are: *Filter* to filter other items out,\
                or *Focus* to make selected items more clear.'
      )
      .addDropdown(async (d) => {
        d.addOptions({
          Filter: 'Filter',
          Focus: 'Focus'
        });
        d.setValue(this.plugin.userOptions.counterBehavior);
        d.onChange(
          async (v) =>
            await this.onOptionUpdate({ counterBehavior: v as typeof this.plugin.userOptions.counterBehavior })
        );
      });

    new Setting(containerEl)
      .setName('Enable Quick Entry Panel')
      .setDesc('Use quick entry panel or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useQuickEntry);
        tg.onChange(async (v) => await this.onOptionUpdate({ useQuickEntry: v }, true));
      });

    new Setting(containerEl)
      .setName('Quick Entry Panel Position')
      .setDesc(
        "Where you like the entry panel to be,\
                * Top means on top of the view,\
                * Bottom means on bottom of the view,\
                * Today means in today's view."
      )
      .addDropdown(async (d) => {
        d.addOptions({
          today: 'today',
          top: 'top',
          bottom: 'bottom'
        });
        d.setValue(this.plugin.userOptions.entryPosition);
        d.onChange(async (v) => await this.onOptionUpdate({ entryPosition: v as 'today' | 'top' | 'bottom' }));
      });

    if (this.plugin.userOptions.useQuickEntry) {
      new Setting(containerEl)
        .setName('Tasks Files')
        .setDesc(
          'Task Files you would like to specify explicitly for quick entry panel.\
                    make sure paths are separated by , .'
        )
        .addTextArea((ta) => {
          ta.setPlaceholder('comma separated file paths, e.g.: path1,path2');
          ta.setValue(this.plugin.userOptions.taskFiles.join(','));
          ta.onChange(async (v) => {
            const values = v.split(',');
            const valuesTrimmed = values.map((p) => p.trim());
            await this.onOptionUpdate({ taskFiles: valuesTrimmed });
          });
        });
      new Setting(containerEl)
        .setName('Inbox')
        .setDesc(
          "Set a file as an 'Inbox' for task items from the quick entry panel.\
                    This file will be displayed on top of the file list."
        )
        .addText((t) => {
          t.setValue(this.plugin.userOptions.inbox);
          t.onChange(async (v) => await this.onOptionUpdate({ inbox: v.trim() }));
        });

      new Setting(containerEl)
        .setName('Section For New Tasks')
        .setDesc('Specify under which section the new task items should be appended.')
        .addText((t) => {
          t.setValue(this.plugin.userOptions.sectionForNewTasks);
          t.onChange(async (v) => await this.onOptionUpdate({ sectionForNewTasks: v }));
        });
    }

    new Setting(containerEl)
      .setName('Daily Note Folder')
      .setDesc('Specify the folder where the daily notes are saved.')
      .addText((t) => {
        t.setValue(this.plugin.userOptions.dailyNoteFolder);
        t.onChange(async (v) => await this.onOptionUpdate({ dailyNoteFolder: v }));
      });

    new Setting(containerEl)
      .setName('Daily Note Format')
      .setDesc(
        TasksCalendarSettingTab.createFragmentWithHTML(
          'Daily note file format.\
                    The format should be of moment format,\
                    see <a href=https://momentjs.com/docs/#/displaying/format/>docs of moment.js</a>\
                    for more details.'
        )
      )
      .addMomentFormat((m) => {
        m.setValue(this.plugin.userOptions.dailyNoteFormat);
        m.onChange(async (v) => await this.onOptionUpdate({ dailyNoteFormat: v }));
      });

    new Setting(containerEl)
      .setName('Enable Year Header')
      .setDesc('Display the year on top of tasks of that year or not.')
      .addToggle((tg) => {
        tg.setValue(this.plugin.userOptions.useYearHeader);
        tg.onChange(async (v) => await this.onOptionUpdate({ useYearHeader: v }));
      });

    new Setting(containerEl)
      .setName('Hide tasks of specific status.')
      .setDesc(
        'Provide comma split status markers, e.g.,: x, - \n\
                Use [ ] if you would like to hide all tasks with marker [ ] or status todo.'
      )
      .addText(async (t) => {
        t.setPlaceholder('Status markers split by comma. e.g.,: x, -.');
        t.setValue(this.plugin.userOptions.hideStatusTasks.join(','));
        t.onChange(
          async (v) =>
            await this.onOptionUpdate({
              hideStatusTasks: v.split(',').map((s) => (s === '[ ]' ? ' ' : s.trim()))
            })
        );
      });

    new Setting(containerEl)
      .setName('Forward Tasks From Past')
      .setDesc('Forward overdue tasks from the past and all unplanned tasks to display them on the today panel or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.forward);
        tg.onChange(async (v) => await this.onOptionUpdate({ forward: v }));
      });

    new Setting(containerEl)
      .setName('Today Focus On Load')
      .setDesc('Activate today focus on load or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.defaultTodayFocus);
        tg.onChange(async (v) => await this.onOptionUpdate({ defaultTodayFocus: v }));
      });
    new Setting(containerEl)
      .setName('Activate Filter On Load')
      .setDesc('Activate a filter or not')
      .addDropdown(async (dd) => {
        dd.addOptions({
          '': 'No filters',
          todoFilter: 'todo',
          overdueFilter: 'overdue',
          unplannedFilter: 'unplanned'
        });
        dd.setValue(this.plugin.userOptions.defaultFilters);
        dd.onChange(async (v) => await this.onOptionUpdate({ defaultFilters: v }));
      });

    containerEl.createEl('h2', { text: 'Task Item Visualization Settings' });

    new Setting(containerEl)
      .setName('Use Relative Date')
      .setDesc('Use relative date to describe the task dates or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useRelative);
        tg.onChange(async (v) => await this.onOptionUpdate({ useRelative: v }));
      });
    new Setting(containerEl)
      .setName('Use Recurrence')
      .setDesc('Display the recurrence information of tasks or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useRecurrence);
        tg.onChange(async (v) => await this.onOptionUpdate({ useRecurrence: v }));
      });
    new Setting(containerEl)
      .setName('Use Priority')
      .setDesc('Display the priority information of tasks or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.usePriority);
        tg.onChange(async (v) => await this.onOptionUpdate({ usePriority: v }));
      });

    const tagSettings = new Setting(containerEl);
    tagSettings.controlEl.empty();
    tagSettings.controlEl.appendChild(createEl('div'));
    let tagBadgeSetting = new Setting(tagSettings.controlEl.firstChild as HTMLElement);
    if (this.plugin.userOptions.useTags) {
      Object.entries(this.plugin.userOptions.tagColorPalette).forEach(([tag, color], index) => {
        if (index !== 0 && !(index & 0x01))
          tagBadgeSetting = new Setting(tagSettings.controlEl.firstChild as HTMLElement);
        tagBadgeSetting.controlEl.appendChild(
          createEl('div', { cls: 'tag', text: `${tag}`, attr: { style: `color: ${color}` } })
        );
        tagBadgeSetting
          .addExtraButton(async (btn) => {
            btn
              .setIcon('cross')
              .setTooltip('Delete')
              .onClick(async () => {
                delete this.plugin.userOptions.tagColorPalette[tag];

                await this.onOptionUpdate({}, true);
              });
          })
          .addExtraButton(async (btn) => {
            btn
              .setIcon('pencil')
              .setTooltip('Edit')
              .onClick(async () => {
                const modal = new TagColorPaletteModal(this.plugin, tag, color);
                modal.onClose = async () => {
                  if (!modal.valid) return;
                  delete this.plugin.userOptions.tagColorPalette[tag];
                  this.plugin.userOptions.tagColorPalette[modal.tagText] = modal.color;

                  await this.onOptionUpdate({}, true);
                };
                modal.open();
              });
          });
      });

      tagSettings.addExtraButton(async (btn) => {
        btn
          .setIcon('plus-with-circle')
          .setTooltip('Add a palette')
          .onClick(async () => {
            const modal = new TagColorPaletteModal(this.plugin);
            modal.onClose = async () => {
              if (!modal.valid) return;
              this.plugin.userOptions.tagColorPalette[modal.tagText] = modal.color;

              await this.onOptionUpdate({}, true);
            };
            modal.open();
          });
      });
    }

    tagSettings
      .setName('Use Tags')
      .setDesc('Display the tags of tasks or not. Color palette can be defined for tags!')
      .addToggle((tg) => {
        tg.setValue(this.plugin.userOptions.useTags);
        tg.onChange(async (v) => {
          await this.onOptionUpdate({ useTags: v }, true);
        });
      });

    this.tagsSettingItem(
      containerEl,
      'Hide Tags',
      'Specify which tags are not necessary to display with a tag badge,\
            note that all tag texts are remove from the displayed item text by default.\
            Also note that the tags are just hided, not removed from the item.',
      this.plugin.userOptions.hideTags,
      (t: string) => {
        return async () => {
          this.plugin.userOptions.hideTags.remove(t);
          await this.onOptionUpdate({}, true);
        };
      },
      async (t: string) => {
        if (this.plugin.userOptions.hideTags.includes(t)) {
          new Notice(`Tag ${t} already exists.`, 5000);
        } else {
          this.plugin.userOptions.hideTags.push(t);
          await this.onOptionUpdate({}, true);
        }
      }
    );

    new Setting(containerEl)
      .setName('Use Filename')
      .setDesc('Display which file the task is from or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useFileBadge);
        tg.onChange(async (v) => this.onOptionUpdate({ useFileBadge: v }));
      });
    new Setting(containerEl)
      .setName('Use Section')
      .setDesc('Display which section the task is from or not.')
      .addToggle(async (tg) => {
        tg.setValue(this.plugin.userOptions.useSection);
        tg.onChange(async (v) => await this.onOptionUpdate({ useSection: v }));
      });

    containerEl.createEl('h2', { text: 'Other Settings' });
    new Setting(containerEl)
      .setName('Date Format')
      .setDesc(
        TasksCalendarSettingTab.createFragmentWithHTML(
          'Specify format you would like to use for dates.\
                Note that the format should be of moment format.\
                See <a href=https://momentjs.com/docs/#/displaying/format/>docs of moment.js</a> for more details.'
        )
      )
      .addMomentFormat(async (m) => {
        m.setPlaceholder('e.g.: YYYY-MM-DD');
        m.setValue(this.plugin.userOptions.dateFormat);
        m.onChange(async (v) => await this.onOptionUpdate({ dateFormat: v }));
      });

    new Setting(containerEl)
      .setName('Sort By')
      .setDesc(
        TasksCalendarSettingTab.createFragmentWithHTML(
          'Specify how you would like the task item to be sorted inside a date.'
        )
      )
      .addDropdown(async (ta) => {
        ta.addOptions(sortOptions);
        ta.setValue(this.plugin.userOptions.sort);
        ta.onChange(async (v) => {
          await this.onOptionUpdate({ sort: v });
        });
      });

    new Setting(containerEl)
      .setName('Use Include Tags')
      .setDesc('Use tags filters to filter tasks without specific tags out or not.')
      .addToggle((tg) => {
        tg.setValue(this.plugin.userOptions.useIncludeTags).onChange(
          async (v) => await this.onOptionUpdate({ useIncludeTags: v }, true)
        );
      });

    if (this.plugin.userOptions.useIncludeTags) {
      this.tagsSettingItem(
        containerEl,
        'Task Include Filters',
        'Filter tasks with specific tags, only tasks with one or more of these tags are displayed.',
        this.plugin.userOptions.taskIncludeTags,
        (t: string) => {
          return async () => {
            this.plugin.userOptions.taskIncludeTags.remove(t);
            await this.onOptionUpdate({}, true);
          };
        },
        async (t: string) => {
          if (this.plugin.userOptions.taskIncludeTags.contains(t)) {
            new Notice(`Tag ${t} already exists.`, 5000);
          } else {
            this.plugin.userOptions.taskIncludeTags.push(t);
            await this.onOptionUpdate({}, true);
          }
        }
      );

      this.tagsSettingItem(
        containerEl,
        'File Include Tags',
        'Filter tasks in specific files which contains one or more of these tags to be displayed.',
        this.plugin.userOptions.fileIncludeTags,
        (t: string) => {
          return async () => {
            this.plugin.userOptions.fileIncludeTags.remove(t);
            await this.onOptionUpdate({}, true);
          };
        },
        async (t: string) => {
          if (this.plugin.userOptions.fileIncludeTags.contains(t)) {
            new Notice(`Tag ${t} already exists.`, 5000);
          } else {
            this.plugin.userOptions.fileIncludeTags.push(t);
            await this.onOptionUpdate({}, true);
          }
        }
      );
    }

    new Setting(containerEl)
      .setName('Use Exclude Tags')
      .setDesc('Use tags filters to filters tasks with specific tags out or not.')
      .addToggle((tg) => {
        tg.setValue(this.plugin.userOptions.useExcludeTags).onChange(
          async (v) => await this.onOptionUpdate({ useExcludeTags: v }, true)
        );
      });

    if (this.plugin.userOptions.useExcludeTags) {
      this.tagsSettingItem(
        containerEl,
        'Task Exclude Filters',
        'Filter tasks without specific tags, only tasks **without any** if these tags are displayed.',
        this.plugin.userOptions.taskExcludeTags,
        (t: string) => {
          return async () => {
            this.plugin.userOptions.taskExcludeTags.remove(t);
            await this.onOptionUpdate({}, true);
          };
        },
        async (t: string) => {
          if (this.plugin.userOptions.taskExcludeTags.contains(t)) {
            new Notice(`Tag ${t} already exists.`, 5000);
          } else {
            this.plugin.userOptions.taskExcludeTags.push(t);
            await this.onOptionUpdate({}, true);
          }
        }
      );

      this.tagsSettingItem(
        containerEl,
        'File Exclude Tags',
        'Filter tasks in specific files which **does not** contains any of these tags to be displayed.',
        this.plugin.userOptions.fileExcludeTags,
        (t: string) => {
          return async () => {
            this.plugin.userOptions.fileExcludeTags.remove(t);
            await this.onOptionUpdate({}, true);
          };
        },
        async (t: string) => {
          if (this.plugin.userOptions.fileExcludeTags.contains(t)) {
            new Notice(`Tag ${t} already exists.`, 5000);
          } else {
            this.plugin.userOptions.fileExcludeTags.push(t);
            await this.onOptionUpdate({}, true);
          }
        }
      );
    }

    new Setting(containerEl)
      .setName('Include Paths')
      .setDesc(
        TasksCalendarSettingTab.createFragmentWithHTML(
          "Exclude tasks match specific paths (folders, files). \n\
                <p style=color:red;>NOTE that no prefix or trailing '/' needed, unless you want to filter the entire vault out.</p>"
        )
      )
      .addTextArea((ta) => {
        ta.setPlaceholder('comma separated file paths, e.g.: path1,path2/path3,path4.md');
        ta.setValue(this.plugin.userOptions.includePaths.join(','));
        ta.onChange(async (v) => {
          const values = v.split(',');
          const valuesTrimmed = values.map((p) => p.trim()).filter((p) => p.length > 0);
          await this.onOptionUpdate({ includePaths: valuesTrimmed });
        });
      });

    new Setting(containerEl)
      .setName('Exclude Paths')
      .setDesc(
        TasksCalendarSettingTab.createFragmentWithHTML(
          "Exclude tasks match specific paths (folders, files). \n\
                <p style=color:red;>NOTE that no prefix or trailing '/' needed, unless you want to filter the entire vault out.</p>"
        )
      )
      .addTextArea((ta) => {
        ta.setPlaceholder('comma separated file paths, e.g.: path1,path2/path3,path4.md');
        ta.setValue(this.plugin.userOptions.excludePaths.join(','));
        ta.onChange(async (v) => {
          const values = v.split(',');
          const valuesTrimmed = values.map((p) => p.trim()).filter((p) => p.length > 0);
          await this.onOptionUpdate({ excludePaths: valuesTrimmed });
        });
      });

    new Setting(containerEl)
      .setName('Filter Empty')
      .setDesc('Filter empty items out or not. If not, the raw text will be displayed.')
      .addToggle((to) => {
        to.setValue(this.plugin.userOptions.filterEmpty);
        to.onChange(async (v) => {
          await this.onOptionUpdate({ filterEmpty: v });
        });
      });
  }

  private tagsSettingItem = (
    container: HTMLElement,
    name: string,
    desc: string,
    tags: string[],
    onDelete: (t: string) => () => Promise<void>,
    onAdd: (t: string) => Promise<void>
  ) => {
    const tagsSetting = new Setting(container).setName(name).setDesc(desc);
    tagsSetting.controlEl.empty();
    tagsSetting.controlEl.appendChild(createDiv());
    let tagsSettingControlEl = new Setting(tagsSetting.controlEl.firstChild as HTMLElement);
    tags.forEach((t, i) => {
      if (i !== 0 && i % 3 === 0) tagsSettingControlEl = new Setting(tagsSetting.controlEl.firstChild as HTMLElement);
      tagsSettingControlEl.controlEl.appendChild(createEl('div', { cls: 'tag', text: t }));
      tagsSettingControlEl.addExtraButton((eb) => {
        eb.setIcon('cross').setTooltip('Delete').onClick(onDelete(t));
      });
    });

    tagsSetting.addExtraButton((eb) => {
      eb.setIcon('plus-with-circle');
      eb.onClick(() => {
        const modal = new TagModal(this.plugin);
        modal.onClose = async () => {
          if (!modal.valid) return;
          await onAdd(modal.tagText);
        };
        modal.open();
      });
    });
  };
}

class TagColorPaletteModal extends Modal {
  tagText: string;
  color: string;
  valid: boolean;
  constructor(plugin: Plugin, tag?: string, color?: string) {
    super(plugin.app);
    this.tagText = tag || '';
    this.color = color || '';
    this.valid = false;
  }
  onOpen(): void {
    this.display();
  }
  display() {
    const { contentEl } = this;
    contentEl.empty();
    const settingDiv = contentEl.createDiv();
    new Setting(settingDiv)
      .setName('Tag and color')
      .setDesc('Enter tag text (# included) in the text input and select color in the color selector.')
      .addText((t) => {
        t.setValue(this.tagText);
        t.onChange((v) => (this.tagText = v));
      })
      .addColorPicker((cp) => {
        cp.setValue(this.color);
        cp.onChange((v) => (this.color = v));
      });
    const footer = contentEl.createDiv();
    new Setting(footer)
      .addButton((btn) => {
        btn.setIcon('checkmark');
        btn.setTooltip('Save');
        btn.onClick(() => {
          if (!this.tagText.match(TaskRegularExpressions.hashTags)) {
            this.valid = false;
            return new Notice(`${this.tagText} seems not a valid tag.`, 5000);
          }
          if (this.color === '') {
            this.valid = false;
            return new Notice('The color seems to be empty, maybe you forget to click the color picker.', 5000);
          }
          this.valid = true;
          this.close();
        });
        return btn;
      })
      .addButton((btn) => {
        btn.setIcon('cross');
        btn.setTooltip('Cancel');
        btn.onClick(() => {
          this.valid = false;
          this.close();
        });
        return btn;
      });
  }
}

class TagModal extends Modal {
  tagText: string;
  valid: boolean;
  constructor(plugin: Plugin) {
    super(plugin.app);
    this.tagText = '';
    this.valid = false;
  }
  onOpen(): void {
    this.display();
  }
  display() {
    const { contentEl } = this;
    contentEl.empty();
    const settingDiv = contentEl.createDiv();
    new Setting(settingDiv)
      .setName('Tag')
      .setDesc('Enter tag text (# included) in the text input and select color in the color selector.')
      .addText((t) => {
        t.setValue(this.tagText);
        t.onChange((v) => {
          this.tagText = v;
        });
        return t;
      });
    const footer = contentEl.createDiv();
    new Setting(footer)
      .addButton((btn) => {
        btn.setIcon('checkmark');
        btn.setTooltip('Save');
        btn.onClick(() => {
          if (!this.tagText.match(TaskRegularExpressions.hashTags)) {
            this.valid = false;
            new Notice(`${this.tagText} seems not a valid tag.`, 5000);
          } else {
            this.valid = true;
          }
          this.close();
        });
        return btn;
      })
      .addButton((btn) => {
        btn.setIcon('cross');
        btn.setTooltip('Cancel');
        btn.onClick(() => {
          this.valid = false;
          this.close();
        });
        return btn;
      });
  }
}
