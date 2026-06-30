import React from "react";
import {
  LayoutDashboard,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileArchive,
  FileMusic,
  FolderPlus,
  MessageSquare,
  Sparkles,
  Wrench,
  Bot,
  Network,
  Settings,
  Bug,
  ChevronRight,
  Plus,
  PlusCircle,
  Trash2,
  Clock,
  Star,
  Database,
  ListTodo,
  CalendarClock,
  History,
  Puzzle,
  Monitor,
  ClipboardList,
  RefreshCw,
  Paperclip,
  Send,
  User,
  Image,
  Video,
  Play,
  LayoutPanelLeft,
  LayoutTemplate,
  Search,
  Logs,
  Copy,
  ShoppingBag,
  Pencil,
  Square,
  Circle,
  Pause,
  StopCircle,
  RotateCw,
  Waypoints,
  Pin,
  PinOff,
  MoreVertical,
  Info,
  AlignLeft,
  List,
  Tag,
  Link,
  ArrowRightLeft,
  StickyNote,
  Boxes,
  Package,
  X,
  Maximize2,
  Minimize2,
  Code2,
  BarChart3,
  Map,
  CheckCircle,
  LoaderCircle,
  AlertCircle,
  Moon,
  Sun,
  Languages,
  MessageCircle,
  ScrollText,
} from "lucide-react";

interface IconProps {
  className?: string;
  size?: number;
}

export const DashboardIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <LayoutDashboard className={className} size={size} />;

export const WorkspaceIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Folder className={className} size={size} />;
export const WorkspaceIcon2 = WorkspaceIcon;

export const ProjectsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FolderPlus className={className} size={size} />
);

export const FilesIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <File className={className} size={size} />
);

export const SessionsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <MessageSquare className={className} size={size} />
);

export const SkillsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Sparkles className={className} size={size} />
);

export const ToolsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Wrench className={className} size={size} />
);

export const AgentsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Bot className={className} size={size} />
);

export const NodesIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Network className={className} size={size} />
);

export const SettingsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Settings className={className} size={size} />
);

export const DebugIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Bug className={className} size={size} />
);

export const ChevronIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <ChevronRight className={className} size={size} />
);

export const NewSessionIcon: React.FC<IconProps> = ({
  className,
  size = 14,
}) => <Plus className={className} size={size} />;
export const NewSessionIcon2: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <PlusCircle className={className} size={size} />;

export const ClearIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <Trash2 className={className} size={size} />
);

export const HistoryIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Clock className={className} size={size} />
);
export const HistoryChatIcon2 = ({ size = 16 }: { size?: number }) => (
  <Clock size={size} />
);

export const FavoritesIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Star className={className} size={size} />;

export const KnowledgeIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Database className={className} size={size} />;

export const TaskQueueIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <ListTodo className={className} size={size} />;

export const ScheduledTasksIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <CalendarClock className={className} size={size} />;

export const ExecutionHistoryIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <History className={className} size={size} />;

export const PluginsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Puzzle className={className} size={size} />
);

export const MonitorIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Monitor className={className} size={size} />
);

export const TasksIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <ClipboardList className={className} size={size} />
);

export const ConfigIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Settings className={className} size={size} />
);

export const CategoryIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <LayoutDashboard className={className} size={size} />
);
export const CategoryIcon2: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Folder className={className} size={size} />;

export const RefreshIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <RefreshCw className={className} size={size} />
);

export const AttachmentIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Paperclip className={className} size={size} />;

export const FolderIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Folder className={className} size={size} />
);
export const FolderOpenIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <FolderOpen className={className} size={size} />;
export const FolderTargetIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <FolderOpen className={className} size={size} />;
export const BrowseFolderIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Folder className={className} size={size} />;

export const SendIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Send className={className} size={size} />
);

export const FileIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <File className={className} size={size} />
);
export const TextFileIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileText className={className} size={size} />
);
export const FileTextIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileText className={className} size={size} />
);
export const FileImageIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <FileImage className={className} size={size} />;
export const FileVideoIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <FileVideo className={className} size={size} />;
export const FilePdfIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileText className={className} size={size} />
);
export const FileCodeIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileCode className={className} size={size} />
);
export const FileZipIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileArchive className={className} size={size} />
);
export const FileMusicIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <FileMusic className={className} size={size} />;
export const FileDefaultIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <File className={className} size={size} />;
export const RepoIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Folder className={className} size={size} />
);

export const ChevronRightIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <ChevronRight className={className} size={size} />;

export const ChatIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <MessageSquare className={className} size={size} />
);

export const UserIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <User className={className} size={size} />
);

export const BotIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Bot className={className} size={size} />
);
export const BotIcon2: React.FC<IconProps> = ({ className, size = 13 }) => (
  <Bot className={className} size={size} />
);

export const ImageIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Image className={className} size={size} />
);
export const VideoIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Video className={className} size={size} />
);
export const PlayIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Play className={className} size={size} />
);

export const StarIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Star className={className} size={size} />
);
export const StarFilledIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Star className={className} size={size} fill="currentColor" />;

export const LayoutVerticalIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <LayoutPanelLeft className={className} size={size} />;
export const LayoutHorizontalIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <LayoutTemplate className={className} size={size} />;

export const SearchIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Search className={className} size={size} />
);

export const LogsIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <FileText className={className} size={size} />
);

export const CopyIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Copy className={className} size={size} />
);

export const MarketIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <ShoppingBag className={className} size={size} />
);

export const EditIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Pencil className={className} size={size} />
);
export const EditIcon2: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Pencil className={className} size={size} />
);

export const SkillsManagerIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Sparkles className={className} size={size} />;

export const SquareIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <Square className={className} size={size} />
);
export const CircleIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <Circle className={className} size={size} />
);
export const PauseIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <Pause className={className} size={size} />
);
export const StopIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <StopCircle className={className} size={size} />
);
export const ResumeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <RotateCw className={className} size={size} />
);

export const LocateIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Waypoints className={className} size={size} />
);

export const ResendIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <RotateCw size={size} />
);

export const PinIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Pin className={className} size={size} />
);
export const UnPinIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <PinOff className={className} size={size} />
);
export const PinFilledIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Pin className={className} size={size} fill="currentColor" />;

export const MoreVerticalIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <MoreVertical className={className} size={size} />;

export const RenameIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Pencil className={className} size={size} />
);

export const DeleteIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Trash2 className={className} size={size} />
);

export const BasicInfoIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Info className={className} size={size} />;
export const DescriptionIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <AlignLeft className={className} size={size} />;
export const StepsIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <List className={className} size={size} />
);
export const TagsIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Tag className={className} size={size} />
);

export const ExampleIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <FileText className={className} size={size} />
);
export const LinkIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Link className={className} size={size} />
);
export const PathIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <ArrowRightLeft className={className} size={size} />
);
export const NoteIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <StickyNote className={className} size={size} />
);

export const InputParamsIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <ArrowRightLeft className={className} size={size} />;
export const OutputParamsIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <ArrowRightLeft className={className} size={size} />;

export const DependencyIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Boxes className={className} size={size} />;
export const MaterialIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Package className={className} size={size} />
);

export const AddIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Plus className={className} size={size} />
);
export const CloseIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <X className={className} size={size} />
);

export const ExpandAllIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Maximize2 className={className} size={size} />;
export const ExpandAllIcon2: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Maximize2 className={className} size={size} />;
export const CollapseIcon: React.FC<IconProps> = ({ className, size = 16 }) => (
  <Minimize2 className={className} size={size} />
);
export const CollapseAllIcon2: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Minimize2 className={className} size={size} />;
export const ExpandArrowsIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Maximize2 className={className} size={size} />;
export const CollapseArrowsIcon: React.FC<IconProps> = ({
  className,
  size = 16,
}) => <Minimize2 className={className} size={size} />;

export const CodeEditorIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <Code2 className={className} size={size} />;
export const ChartIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <BarChart3 className={className} size={size} />
);
export const MapIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Map className={className} size={size} />
);

export const GithubIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <CheckCircle className={className} size={size} />;
export const SpinnerIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <LoaderCircle className={className} size={size} />
);
export const AlertCircleIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <AlertCircle className={className} size={size} />;
export const InfoIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Info className={className} size={size} />
);

export const ListIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <List className={className} size={size} />
);

export const SunIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Sun className={className} size={size} />
);

export const MoonIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Moon className={className} size={size} />
);

export const LanguageIcon: React.FC<IconProps> = ({ className, size = 18 }) => (
  <Languages className={className} size={size} />
);

export const ScrollTextIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <ScrollText className={className} size={size} />;

export const MessageCircleIcon: React.FC<IconProps> = ({
  className,
  size = 18,
}) => <MessageCircle className={className} size={size} />;

export const iconMap: Record<string, React.FC<IconProps>> = {
  dashboard: DashboardIcon,
  workspace: WorkspaceIcon,
  projects: ProjectsIcon,
  files: FilesIcon,
  sessions: SessionsIcon,
  skills: SkillsIcon,
  tools: ToolsIcon,
  agents: AgentsIcon,
  nodes: NodesIcon,
  settings: SettingsIcon,
  debug: DebugIcon,
  newSession: NewSessionIcon,
  clear: ClearIcon,
  history: HistoryIcon,
  favorites: FavoritesIcon,
  knowledge: KnowledgeIcon,
  taskQueue: TaskQueueIcon,
  scheduledTasks: ScheduledTasksIcon,
  executionHistory: ExecutionHistoryIcon,
  plugins: PluginsIcon,
  monitor: MonitorIcon,
  tasks: TasksIcon,
  config: ConfigIcon,
  atomicSkills: SkillsIcon,
  category: CategoryIcon,
  refresh: RefreshIcon,
  attachment: AttachmentIcon,
  folder: FolderIcon,
  send: SendIcon,
  folderOpen: FolderOpenIcon,
  file: FileIcon,
  chevronRight: ChevronRightIcon,
  chat: ChatIcon,
  user: UserIcon,
  bot: BotIcon,
  bot2: BotIcon2,
  textFile: TextFileIcon,
  image: ImageIcon,
  video: VideoIcon,
  star: StarIcon,
  starFilled: StarFilledIcon,
  play: PlayIcon,
  layoutVertical: LayoutVerticalIcon,
  layoutHorizontal: LayoutHorizontalIcon,
  logs: LogsIcon,
  copy: CopyIcon,
  skillMarket: MarketIcon,
  fileText: FileTextIcon,
  fileImage: FileImageIcon,
  fileVideo: FileVideoIcon,
  filePdf: FilePdfIcon,
  fileCode: FileCodeIcon,
  fileZip: FileZipIcon,
  fileMusic: FileMusicIcon,
  fileDefault: FileDefaultIcon,
  editIcon: EditIcon,
  skillsManager: SkillsManagerIcon,
  locate: LocateIcon,
  pin: PinIcon,
  pinFilled: PinFilledIcon,
  moreVertical: MoreVerticalIcon,
  rename: RenameIcon,
  delete: DeleteIcon,
  codeEditor: CodeEditorIcon,
  chart: ChartIcon,
  map: MapIcon,
  scrollText: ScrollTextIcon,
  messageCircle: MessageCircleIcon,
};
