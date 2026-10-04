/**
 * Icon exports for the UserProfile page.
 */
import React from "react";
import {
  User,
  X,
  MessageSquare,
  FileText,
  Sparkles,
  Settings,
  Flame,
  Trophy,
  TrendingDown,
  BarChart3,
  Clock,
  Sunrise,
  Zap,
  Compass,
  Gem,
  Loader2,
  RefreshCw,
  Layers,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";

export const UserIcon = () => <User size={16} />;
export const CloseIcon = () => <X size={14} />;
export const MessageIcon = () => <MessageSquare size={13} />;
export const FileTextIcon = () => <FileText size={13} />;
export const CrystalIcon = () => <Sparkles size={13} />;
export const SettingsIcon = () => <Settings size={13} />;
export const FireIcon = () => <Flame size={13} />;
export const TrophyIcon = () => <Trophy size={13} />;
export const ChartIcon = () => <TrendingDown size={12} />;
export const BarChart3Icon = () => <BarChart3 size={12} />;
export const ClockIcon = () => <Clock size={12} />;
export const SunriseIcon = () => <Sunrise size={16} />;
export const ZapIcon = () => <Zap size={16} />;
export const CompassIcon = () => <Compass size={16} />;
export const GemIcon = () => <Gem size={16} />;
export const LoadingSpinnerIcon = () => <Loader2 size={32} className="loading-spinner-svg" />;
export const RefreshCwIcon = ({ size = 16 }: { size?: number }) => <RefreshCw size={size} />;
export const LayersIcon = () => <Layers size={12} />;
export const SubsystemImageIcon = () => <ImageIcon size={13} />;
export const MusicIcon = () => <Music size={13} />;
export const VideoIcon = () => <Video size={13} />;