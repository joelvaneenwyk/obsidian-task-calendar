import { Link } from 'dataview-util/markdown';
import {
  App,
  CachedMetadata,
  FrontMatterCache,
  LinkCache,
  ListItemCache,
  Pos,
  SectionCache,
  TFile,
  TagCache,
  moment
} from 'obsidian';
import { PartialUserOption, UserOption, UserOptions } from 'settings';
import * as TaskMappable from 'utils/task-mappable';
import { SortableTask, TaskDataModel, TaskRegularExpressions, TaskStatus, TaskStatusMarkerMap } from 'utils/tasks';

export type TaskModifier = (task: TaskDataModel) => TaskDataModel;
export type TaskFilter = (task: TaskDataModel) => boolean;
export type TaskTransformer = TaskFilter | TaskModifier;
export type TaskId = string;
export type FilePath = string;

type SortFunction = (a: SortableTask, b: SortableTask) => number;

export function defaultSort(t1: SortableTask, t2: SortableTask): number {
  try {
    const o1 = t1?.order ?? 0;
    const o2 = t2?.order ?? 0;
    if (o1 <= o2) {
      return -1;
    } else if (o1 === o2) {
      return 0;
    }
  } catch {
    // ignore
  }
  return 1;
}

export class TaskOptions extends UserOptions {
  public filters: TaskFilter[] = [];
  public modifiers: TaskModifier[] = [];
  public sortFunction: SortFunction = defaultSort;

  public constructor() {
    super();
  }

  public set(settings: PartialUserOption): TaskOptions {
    super.set(settings);

    const getFilters = function (opts: TaskOptions): TaskFilter[] {
      const filters: TaskFilter[] = [
        /**
         * Status Filters
         */
        (task: TaskDataModel) => {
          if (opts.hideStatusTasks.length === 0) return true;
          if (opts.hideStatusTasks.includes(task.statusMarker)) return false;
          return !opts.hideStatusTasks.some(
            (marker) => TaskStatusMarkerMap[marker as keyof typeof TaskStatusMarkerMap] === task.status
          );
        },
        /**
         * Tag Filter: Includes
         */
        (task: TaskDataModel) => {
          if (opts.useIncludeTags === false) return true;
          const tagIncludes = opts.taskIncludeTags;
          if (!tagIncludes) return true;
          if (tagIncludes.length === 0) return true;
          if (tagIncludes.some((tag) => task.tags.includes(tag))) return true;
          return false;
        },
        /**
         * Tag Filter: Exclusions
         */
        (task: TaskDataModel) => {
          if (opts.useExcludeTags === false) return true;
          const tagExcludes = opts.taskExcludeTags;
          if (!tagExcludes) return true;
          if (tagExcludes.length === 0) return true;
          if (tagExcludes.every((tag) => !task.tags.includes(tag))) return true;
          return false;
        },
        /**
         * Filter empty
         */
        (task: TaskDataModel) => {
          const visual: string = task.visual?.trim() ?? '';
          return opts.filterEmpty === false || visual !== '';
        }
      ];
      return filters;
    };

    const getModifiers = function (opts: TaskOptions): TaskModifier[] {
      const modifiers: TaskModifier[] = [
        TaskMappable.tasksPluginTaskParser,
        TaskMappable.dataviewTaskParser,
        TaskMappable.dailyNoteTaskParser(opts.dailyNoteFormat),
        TaskMappable.tagsParser,
        TaskMappable.remainderParser,
        TaskMappable.postProcessor,
        TaskMappable.taskLinkParser,
        /**
         * Option Forward
         * Current behavior: show unplanned and overdue tasks in today's part.
         */
        (t: TaskDataModel) => {
          if (opts.forward !== true) return t;
          if (t.status === TaskStatus.unplanned) t.dates.set(TaskStatus.unplanned, moment());
          else if (t.status === TaskStatus.done && !t.completion && !t.due && !t.start && !t.scheduled && !t.created)
            t.dates.set('done-unplanned', moment());
          else if (t.status === TaskStatus.overdue && !TaskMappable.filterDate(moment())(t))
            t.dates.set(TaskStatus.overdue, moment());
          return t;
        },
        /**
         * Post processor
         */
        (t: TaskDataModel) => {
          if (!opts.taskStatusOrder) return t;
          if (!opts.taskStatusOrder.includes(t.status)) return t;
          t.order = opts.taskStatusOrder.indexOf(t.status) + 1;
          return t;
        }
      ];
      return modifiers;
    };

    try {
      // This was previously:
      //
      //  const sort = eval(this.userOptionModel.get("sort")!);
      //
      // But due to direct eval (see https://esbuild.github.io/content-types/#direct-eval) this
      // was changed to the following.
      const sortFunction: SortFunction = (0, eval)(this.sort) as SortFunction;
      const test = sortFunction({ order: 2 }, { order: 1 });
      if (test > 0) {
        this.sortFunction = sortFunction;
      } else {
        throw new Error('Test function failed.');
      }
    } catch (error) {
      console.warn(`[task-calendar] Sorting lambda is not applicable or invalid in some way. ${error}`);
    }

    this.modifiers = getModifiers(this);
    this.filters = getFilters(this);

    return this;
  }
}

function getFulfilled<T>(values: PromiseSettledResult<T | null>[]): T[] {
  return values
    .filter(
      <T>(input: PromiseSettledResult<T | null>): input is PromiseFulfilledResult<T> =>
        input.status === 'fulfilled' && (input as PromiseFulfilledResult<T>).value !== null
    )
    .map((task) => task.value);
}

function getRejected<T>(values: PromiseSettledResult<T | null>[]): string[] {
  return values
    .filter((input: PromiseSettledResult<unknown>): input is PromiseRejectedResult => input.status === 'rejected')
    .map((error) => `${error.reason ?? 'Unknown error.'}`);
}

export class TaskResults {
  tasks: TaskDataModel[] = [];
  errors: string[] = [];
}

export class FileTaskCache {
  public readonly file: TFile;
  private _cache?: CachedMetadata | null;
  public readonly adapter: ObsidianTaskAdapter;
  public readonly link: Link;
  public readonly id: string;

  private _items: ItemTaskCache[] | null = null;
  private _tasks: TaskDataModel[] | null = null;
  private readonly _modifiers: TaskModifier[];
  private readonly _filters: TaskFilter[];

  constructor(adapter: ObsidianTaskAdapter, file: TFile, modifiers: TaskModifier[], filters: TaskFilter[]) {
    this.adapter = adapter;
    this.file = file;
    this.id = file.path;
    this.link = Link.file(file.path);
    this._modifiers = modifiers;
    this._filters = filters;
  }

  private get cache(): CachedMetadata | null {
    const cache =
      this._cache === undefined ? (this._cache = this.adapter._app.metadataCache.getFileCache(this.file)) : this._cache;
    this._cache = cache;
    return cache;
  }

  public get tasks(): Promise<TaskDataModel[]> {
    return this.getTasks();
  }

  public fromItemCache(item: ListItemCache) {
    return this.adapter.fromItemCache(
      item,
      this.link,
      this.file.path,
      this.adapter._app.vault.cachedRead(this.file),
      this.cache?.sections,
      this.cache?.links,
      this.cache?.frontmatter,
      this.cache?.tags
    );
  }

  private async getTasks() {
    if (this._tasks === null) {
      this._tasks = [];
      try {
        for await (const item of this.items) {
          const task = await item.task;
          if (task === null) {
            continue;
          }

          // Pass the task through each modifier to get the final task data model
          const transformedTask = this._modifiers.reduce<TaskDataModel | null>(
            (task: TaskDataModel | null, modifier: TaskModifier) => (task ? modifier(task) : null),
            task
          );

          if (transformedTask !== null && this._filters.every((filter: TaskFilter) => filter(transformedTask))) {
            this._tasks.push(transformedTask);
          }
        }
      } catch (error) {
        console.warn(`[task-calendar] Exception while resolving files: ${error}`);
      }
    }
    return [...this._tasks];
  }

  public get items() {
    if (this._items === null) {
      if (this.cache !== null && this.cache.listItems !== undefined) {
        // Create a new item task cache for each item
        this._items = this.cache.listItems.map((item) => new ItemTaskCache(this, item));
      } else {
        this._items = [];
      }
    }

    // Return a copy of the list of items
    return [...this._items];
  }

  public get isValid(): boolean {
    return this.cache === null || (this.cache.listItems?.length ?? 0) == 0;
  }
}

export class ItemTaskCache {
  private _asyncTaskData: Promise<TaskDataModel | null> | null = null;
  private readonly _item: ListItemCache;
  private readonly _fileCache: FileTaskCache;

  public readonly id: string;

  constructor(fileCache: FileTaskCache, item: ListItemCache) {
    this._fileCache = fileCache;
    this._item = item;
    this.id = `${fileCache.id}${item.id ?? item.parent.toString()}`;
  }

  public get resolved(): boolean {
    return this._asyncTaskData !== null;
  }

  public get task(): Promise<TaskDataModel | null> {
    if (this._asyncTaskData === null) {
      this._asyncTaskData = this.getTaskDataModel();
    }
    return this._asyncTaskData;
  }

  private remove() {
    // Add to cache so we do not process it again until we need to.
    if (!(this.id in this._fileCache.adapter.internalFileQueue)) {
      this._fileCache.adapter.internalFileQueue[this.id] = [];
    }

    this._fileCache.adapter.internalFileQueue[this.id].remove(this._fileCache);

    if (this.id in this._fileCache.adapter.internalListQueue) {
      delete this._fileCache.adapter.internalListQueue[this.id];
    }
  }

  private async getTaskDataModel() {
    let taskData: TaskDataModel | null = null;
    try {
      // Add to cache so we do not process it again until we need to.
      if (!(this._fileCache.id in this._fileCache.adapter.internalFileQueue)) {
        this._fileCache.adapter.internalFileQueue[this._fileCache.id] = [];
      }
      this._fileCache.adapter.internalFileQueue[this._fileCache.id].push(this._fileCache);

      let itemTaskCache: ItemTaskCache | null = null;
      if (this.id in this._fileCache.adapter.internalListQueue) {
        itemTaskCache = this._fileCache.adapter.internalListQueue[this.id];
        if (itemTaskCache.resolved) {
          itemTaskCache = null;
        }
      }

      this._fileCache.adapter.internalListQueue[this.id] = itemTaskCache ?? this;
      taskData = await this._fileCache.fromItemCache(this._item);
    } catch (error) {
      console.warn(`[task-calendar] Failed to resolve item. ${error}`);
    } finally {
      this.remove();
    }

    return taskData;
  }
}

export class ObsidianTaskAdapter {
  public readonly _app: App;
  private _tasks: Record<TaskId, TaskDataModel> = {};
  public internalFileQueue: Record<FilePath, FileTaskCache[]> = {};
  public internalListQueue: Record<TaskId, ItemTaskCache> = {};
  private _options: TaskOptions = new TaskOptions();

  public onAdd?: (task: TaskDataModel) => void;
  public onFinished?: (tasks: TaskDataModel[]) => void;

  constructor(app: App) {
    this._app = app;

    this.generateTasksList = this.generateTasksList.bind(this);
    this.fromItemCache = this.fromItemCache.bind(this);
    this.fromLine = this.fromLine.bind(this);
    this.fileExcludeTagsFilter = this.fileExcludeTagsFilter.bind(this);
    this.fileIncludeTagsFilter = this.fileIncludeTagsFilter.bind(this);
  }

  private static isParent(parent: string, path: string) {
    if (parent.length > path.length) return false;
    const paths = path.split('/');
    const parents = parent.split('/');
    return parents.every((v, i) => v === paths[i]);
  }

  private static pathsIncludeFile(filter: string[]) {
    return (file: TFile) =>
      filter.length === 0 || filter.some((includePath) => ObsidianTaskAdapter.isParent(includePath, file.path));
  }

  private static pathsExcludeFilter(filter: string[]) {
    return (file: TFile) =>
      filter.length === 0 || filter.every((excludePath) => !ObsidianTaskAdapter.isParent(excludePath, file.path));
  }

  private fileIncludeTagsFilter(filter: string[]) {
    return (file: TFile) => {
      const cache = this._app.metadataCache.getFileCache(file);
      if (cache === null || filter.length === 0 || cache.tags === undefined) {
        return true;
      }
      const tags = cache.tags.map((t) => t.tag);
      return tags === undefined || filter.some((tag) => tags.includes(tag));
    };
  }

  private fileExcludeTagsFilter(filter: string[]) {
    return (file: TFile) => {
      const cache = this._app.metadataCache.getFileCache(file);
      if (cache === null || filter.length === 0 || cache.tags === undefined) {
        return true;
      }
      const tags = cache.tags.map((tagCache: TagCache) => tagCache.tag);
      return tags === undefined || filter.every((tag) => !tags.includes(tag));
    };
  }

  public async setTasks(
    includeFilter: string[],
    excludeFilter: string[],
    includeTags: string[],
    excludeTags: string[],
    userOptions: Partial<UserOption>
  ) {
    try {
      const options = this.setOptions(userOptions);
      const fileTasks = this.generateTasksList(
        includeFilter,
        excludeFilter,
        includeTags,
        excludeTags,
        options.modifiers,
        options.filters
      );

      try {
        const result: TaskResults = new TaskResults();

        try {
          // Go through each file promise and extract the tasks from each one and then flatten that
          // list into a single array of promises.
          const tasks = await Promise.allSettled(fileTasks.map((item) => item.tasks));
          result.tasks.push(...getFulfilled(tasks).flat());
          result.errors.push(...getRejected(tasks));
          result.errors.forEach((error) => {
            console.error(`[task-calendar] ${error}`);
          });
        } catch (error) {
          console.error(`[task-calendar] Exception: ${error}`);
        }

        result.tasks.forEach((task: TaskDataModel) => {
          this._tasks[task.path] = task;
        });

        return result.tasks;
      } catch (error) {
        console.error(`[task-calendar] Exception: ${error}`);
      }
    } catch (error) {
      console.log('Abandoned calendar task.');
    }

    return [];
  }

  /**
   * Get a flat array of all tasks.
   */
  public get tasks(): TaskDataModel[] {
    const tasks: TaskDataModel[] = [];

    for (const taskId in this._tasks) {
      tasks.push(this._tasks[taskId]);
    }

    try {
      tasks.sort(this._options.sortFunction);
    } catch (error) {
      console.warn(`[task-calendar] Sorting lambda is not applicable or invalid in some way. ${error}`);
    }

    return tasks;
  }

  public get files(): string[] {
    return this.tasks.map((task) => task.path).filter((path) => path !== '');
  }

  private generateTasksList(
    includeFilter: string[],
    excludeFilter: string[],
    includeTags: string[],
    excludeTags: string[],
    modifiers: TaskModifier[],
    filters: TaskFilter[]
  ) {
    const files = this._app.vault.getMarkdownFiles();
    const filteredIncluded = files.filter(ObsidianTaskAdapter.pathsIncludeFile(includeFilter));
    const filteredExcluded = filteredIncluded.filter(ObsidianTaskAdapter.pathsExcludeFilter(excludeFilter));
    const filteredIncludedTags = filteredExcluded.filter(this.fileIncludeTagsFilter(includeTags));
    const filteredExcludedTags = filteredIncludedTags.filter(this.fileExcludeTagsFilter(excludeTags));
    const newFiles = filteredExcludedTags.filter((file) => {
      if (!(file.path in this.internalFileQueue)) {
        this.internalFileQueue[file.path] = [];
      }
      return this.internalFileQueue[file.path].length === 0;
    });
    return newFiles.map((file: TFile) => new FileTaskCache(this, file, modifiers, filters));
  }

  /**
   * Update local options and create transformers based on the state which will be used
   * when we are gathering tasks.
   *
   * @param options Set of options to update.
   * @returns Updated set of options.
   */
  private setOptions(options: Partial<UserOption>): TaskOptions {
    return this._options.set(options);
  }

  /**
   * This function takes all known list items as input and passes them to fromLine.
   * @param link A Link object points to the file where the list item belongs. It can also be constructed from the file path,
   * the only reason this is an augment is to avoid constructing one same @see {Link} for every item.
   * @param filePath The path of the file where the list item belongs.
   * @param fileContent The file content for extracting the raw texts for list items. The reason this is an augment is to avoiding
   * reading one same file for every item.
   * @param sections The section cache from Obsidian.
   * @param links The link cache from Obsidian.
   * @param frontmatter The frontmatter cache from Obsidian.
   * @param tags The tag cache from Obsidian.
   * @returns This function directly modify @see {this.taskList}.
   */
  public async fromItemCache(
    item: ListItemCache,
    link: Link,
    filePath: string,
    fileContent: Promise<string>,
    sections?: SectionCache[],
    links?: LinkCache[],
    frontMatter?: FrontMatterCache,
    tagsCache?: TagCache[]
  ): Promise<TaskDataModel | null> {
    const findParent = () => {
      if (!sections) return null;
      if (item.parent > 0) {
        for (const section of sections) {
          if (section.position.start.line === item.parent) {
            return section;
          }
        }
      } else {
        let position: number = -1;
        let parentHeader: SectionCache | null = null;
        for (const section of sections) {
          if (
            section.type === 'heading' &&
            section.position.start.line > position &&
            section.position.start.line < item.position.start.line
          ) {
            parentHeader = section;
            position = parentHeader.position.start.line;
          }
        }
        return parentHeader;
      }
      return null;
    };

    const findOutLinks = (line: number): LinkCache[] => {
      if (!links) return [];
      return links.filter((s) => s.position.start.line === line);
    };

    const findTags = (line: number): string[] => {
      if (!tagsCache) return [];
      return tagsCache.filter((cache) => cache.position.start.line === line).map((cache) => cache.tag);
    };

    const fileContentView = await fileContent;
    const sliceFileContent = (position: Pos) => {
      return fileContentView.slice(position.start.offset, position.end.offset);
    };

    const itemPosition = item.position;
    const itemText = sliceFileContent(itemPosition);
    const parentItem = findParent();
    const outLinks = findOutLinks(itemPosition.start.line);
    const parentLink = parentItem ? link.withSectionCache(parentItem, sliceFileContent(parentItem.position)) : link;
    const outLinkLinks = outLinks ? outLinks.map((v) => Link.withLinkCache(v)) : [];
    const tags = findTags(itemPosition.start.line);

    return this.fromLine(itemText, filePath, parentLink, itemPosition, outLinkLinks, tags, frontMatter);
  }

  /**
   * This function parse the raw text of a list item and judge if it is a task item.
   * If it is a task item, it extract only basic information to construct a @see {TaskDataModel}.
   * All other information should be in the @see {TaskDataModel.text} field.
   *
   * @param line The raw text of the list item, including the list markers
   * @param filePath The file path where the list item is from.
   * @param parent A Link object points to the parent section of the list item.
   * @param position A Pos object from Obsidian.
   * @param outLinks Links from Obsidian.
   * @param frontMatter The yaml data in the header of the file where the list item belongs.
   * @param tags Tag list contained in the list item.
   * @returns A TaskDataModel with basic information if the list item is a Task, null if it is not.
   */
  private fromLine(
    line: string,
    filePath: string,
    parent: Link,
    position: Pos,
    outLinks: Link[],
    tags: string[],
    frontMatter?: FrontMatterCache
  ): TaskDataModel | null {
    // Check the line to see if it is a Markdown task.
    const regexMatch = line.match(TaskRegularExpressions.taskRegex);
    if (regexMatch === null) {
      return null;
    }

    // match[4] includes the whole body of the task after the brackets.
    const body = regexMatch[4].trim();

    let description = body;
    // const indentation = regexMatch[1]; // before - [ ]
    const listMarker = regexMatch[2]; // - for - [ ]

    // Get the status of the task.
    const statusString = regexMatch[3]; // x for - [x]
    //const status = statusString;// StatusRegistry.getInstance().bySymbolOrCreate(statusString);

    // Match for block link and remove if found. Always expected to be
    // at the end of the line.
    const blockLinkMatch = description.match(TaskRegularExpressions.blockLinkRegex);
    const blockLink = blockLinkMatch !== null ? blockLinkMatch[0] : '';

    if (blockLink !== '') {
      description = description.replace(TaskRegularExpressions.blockLinkRegex, '').trim();
    }

    if (frontMatter) {
      if (frontMatter['tag'] && typeof frontMatter['tag'] === 'string') {
        tags.push(frontMatter['tag']);
      }
      if (frontMatter['tags'] && typeof frontMatter['tags'] === typeof new Array<string>()) {
        (frontMatter['tags'] as unknown as Array<string>).forEach((t) => tags.push(t));
      }
    }

    tags = [...new Set(tags)];

    const taskItem: TaskDataModel = {
      symbol: listMarker,
      link: parent,
      section: parent,
      text: line,
      visual: description.trim(),
      tags: tags,
      line: position.start.line,
      lineCount: position.end.line - position.start.line + 1,
      list: position.start.line,
      outlinks: outLinks,
      path: filePath,
      children: [],
      task: true,
      annotated: false,
      position: position,
      subtasks: [],
      real: true,
      header: parent,
      status: statusString,
      statusMarker: statusString,
      checked: description.replace(' ', '').length !== 0,
      completed: statusString === 'x',
      fullyCompleted: statusString !== ' ',
      dailyNote: false,
      order: 0,
      priority: '',
      //happens: new Map<string, string>(),
      recurrence: '',
      frontMatter: frontMatter || {},
      isTasksTask: false,
      due: undefined,
      scheduled: undefined,
      start: undefined,
      completion: undefined,
      dates: new Map()
    };
    return taskItem;
  }
}
