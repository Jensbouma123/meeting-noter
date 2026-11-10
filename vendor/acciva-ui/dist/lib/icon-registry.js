// Named per-icon imports, never `import * as`: a namespace import plus dynamic lookup pulls every
// lucide icon into each consumer route (slow dev compiles, no tree-shaking).
import { Home, Search, Menu, MoreHorizontal, MoreVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, ArrowUpLeft, ArrowDownLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp, ChevronsDown, ChevronsLeft, ChevronsRight, Compass, Navigation, Map, MapPin, ExternalLink, Settings, Settings2, Sliders, ToggleLeft, ToggleRight, Plus, Minus, X, Check, CheckCircle, XCircle, AlertCircle, AlertTriangle, Info, HelpCircle, Loader2, RefreshCw, RotateCw, RotateCcw, Grid, List, Layout, Layers, Filter, Eye, EyeOff, Bookmark, Flag, Tag, Star, Puzzle, Mail, Send, MessageCircle, MessageSquare, Phone, Bell, Inbox, LogIn, LogOut, Share, Share2, Link, Link2, Paperclip, Image, Camera, Video, Film, Music, Mic, MicOff, Volume2, VolumeX, Play, Pause, Square, SkipBack, SkipForward, Repeat, Shuffle, File, FileText, Folder, FolderOpen, Archive, Save, Download, Upload, Copy, Clipboard, ClipboardCheck, Trash2, Edit, Edit2, Edit3, Pencil, ShoppingCart, ShoppingBag, CreditCard, DollarSign, Wallet, Receipt, Store, Gift, Award, Trophy, Package, Box, Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, Wind, Droplet, Umbrella, Zap, Flame, Snowflake, Thermometer, Plane, Car, Truck, Ship, Bike, Train, Bus, Rocket, Globe, Code, Code2, Terminal, GitBranch, GitCommit, GitMerge, GitPullRequest, Cpu, Database, Server, HardDrive, Bug, PenTool, BarChart, BarChart2, PieChart, LineChart, Activity, TrendingUp, TrendingDown, User, Users, UserPlus, UserMinus, UserCheck, UserX, GraduationCap, Briefcase, Lock, Unlock, Shield, ShieldCheck, Key, Wifi, WifiOff, Bluetooth, Battery, BatteryCharging, Power, Smartphone, Laptop, Monitor, Tablet, Smile, Frown, Meh, Laugh, Heart, ThumbsUp, ThumbsDown, Building, Building2, Coffee, Utensils, Pizza, Apple, Book, BookOpen, School, Paintbrush, Palette, Ruler, Scissors, Wrench, Hammer, Cog, Sparkles, Gem, Crown, Calendar, Clock, } from "lucide-react";
export const ICON_CATEGORIES = {
    Navigation: [
        "Home", "Search", "Menu", "MoreHorizontal", "MoreVertical", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "ArrowUpRight", "ArrowDownRight", "ArrowUpLeft", "ArrowDownLeft", "ChevronUp", "ChevronDown", "ChevronLeft",
        "ChevronRight", "ChevronsUp", "ChevronsDown", "ChevronsLeft", "ChevronsRight", "Compass", "Navigation",
        "Map", "MapPin", "ExternalLink",
    ],
    Interface: [
        "Settings", "Settings2", "Sliders", "ToggleLeft", "ToggleRight", "Plus", "Minus", "X", "Check", "CheckCircle",
        "XCircle", "AlertCircle", "AlertTriangle", "Info", "HelpCircle", "Loader2", "RefreshCw", "RotateCw", "RotateCcw",
        "Grid", "List", "Layout", "Layers", "Filter", "Eye", "EyeOff", "Bookmark", "Flag", "Tag", "Star", "Puzzle",
    ],
    Communication: [
        "Mail", "Send", "MessageCircle", "MessageSquare", "Phone", "Bell", "Inbox", "LogIn", "LogOut", "Share",
        "Share2", "Link", "Link2", "Paperclip",
    ],
    Media: [
        "Image", "Camera", "Video", "Film", "Music", "Mic", "MicOff", "Volume2", "VolumeX", "Play", "Pause", "Square",
        "SkipBack", "SkipForward", "Repeat", "Shuffle",
    ],
    Files: [
        "File", "FileText", "Folder", "FolderOpen", "Archive", "Save", "Download", "Upload", "Copy", "Clipboard",
        "ClipboardCheck", "Trash2", "Edit", "Edit2", "Edit3", "Pencil",
    ],
    Commerce: [
        "ShoppingCart", "ShoppingBag", "CreditCard", "DollarSign", "Wallet", "Receipt", "Store", "Gift", "Award",
        "Trophy", "Package", "Box",
    ],
    "Weather & Nature": [
        "Sun", "Moon", "Cloud", "CloudSun", "CloudRain", "CloudSnow", "Wind", "Droplet", "Umbrella", "Zap", "Flame",
        "Snowflake", "Thermometer",
    ],
    Travel: ["Plane", "Car", "Truck", "Ship", "Bike", "Train", "Bus", "Rocket", "Globe"],
    Development: [
        "Code", "Code2", "Terminal", "GitBranch", "GitCommit", "GitMerge", "GitPullRequest", "Cpu", "Database",
        "Server", "HardDrive", "Bug", "PenTool",
    ],
    "Charts & Data": ["BarChart", "BarChart2", "PieChart", "LineChart", "Activity", "TrendingUp", "TrendingDown"],
    People: ["User", "Users", "UserPlus", "UserMinus", "UserCheck", "UserX", "GraduationCap", "Briefcase"],
    Security: ["Lock", "Unlock", "Shield", "ShieldCheck", "Key"],
    Devices: ["Wifi", "WifiOff", "Bluetooth", "Battery", "BatteryCharging", "Power", "Smartphone", "Laptop", "Monitor", "Tablet"],
    Emotion: ["Smile", "Frown", "Meh", "Laugh", "Heart", "ThumbsUp", "ThumbsDown"],
    Misc: [
        "Building", "Building2", "Coffee", "Utensils", "Pizza", "Apple", "Book", "BookOpen", "School", "Paintbrush",
        "Palette", "Ruler", "Scissors", "Wrench", "Hammer", "Cog", "Sparkles", "Gem", "Crown", "Calendar", "Clock",
    ],
};
const ICONS = {
    Home, Search, Menu, MoreHorizontal, MoreVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight,
    ArrowDownRight, ArrowUpLeft, ArrowDownLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp,
    ChevronsDown, ChevronsLeft, ChevronsRight, Compass, Navigation, Map, MapPin, ExternalLink, Settings,
    Settings2, Sliders, ToggleLeft, ToggleRight, Plus, Minus, X, Check, CheckCircle, XCircle, AlertCircle,
    AlertTriangle, Info, HelpCircle, Loader2, RefreshCw, RotateCw, RotateCcw, Grid, List, Layout, Layers, Filter,
    Eye, EyeOff, Bookmark, Flag, Tag, Star, Puzzle, Mail, Send, MessageCircle, MessageSquare, Phone, Bell, Inbox,
    LogIn, LogOut, Share, Share2, Link, Link2, Paperclip, Image, Camera, Video, Film, Music, Mic, MicOff,
    Volume2, VolumeX, Play, Pause, Square, SkipBack, SkipForward, Repeat, Shuffle, File, FileText, Folder,
    FolderOpen, Archive, Save, Download, Upload, Copy, Clipboard, ClipboardCheck, Trash2, Edit, Edit2, Edit3,
    Pencil, ShoppingCart, ShoppingBag, CreditCard, DollarSign, Wallet, Receipt, Store, Gift, Award, Trophy,
    Package, Box, Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, Wind, Droplet, Umbrella, Zap, Flame,
    Snowflake, Thermometer, Plane, Car, Truck, Ship, Bike, Train, Bus, Rocket, Globe, Code, Code2, Terminal,
    GitBranch, GitCommit, GitMerge, GitPullRequest, Cpu, Database, Server, HardDrive, Bug, PenTool, BarChart,
    BarChart2, PieChart, LineChart, Activity, TrendingUp, TrendingDown, User, Users, UserPlus, UserMinus,
    UserCheck, UserX, GraduationCap, Briefcase, Lock, Unlock, Shield, ShieldCheck, Key, Wifi, WifiOff, Bluetooth,
    Battery, BatteryCharging, Power, Smartphone, Laptop, Monitor, Tablet, Smile, Frown, Meh, Laugh, Heart,
    ThumbsUp, ThumbsDown, Building, Building2, Coffee, Utensils, Pizza, Apple, Book, BookOpen, School,
    Paintbrush, Palette, Ruler, Scissors, Wrench, Hammer, Cog, Sparkles, Gem, Crown, Calendar, Clock,
};
export function getIconComponent(name) {
    const candidate = Object.hasOwn(ICONS, name) ? ICONS[name] : undefined;
    return typeof candidate === "function" || typeof candidate === "object" ? candidate : undefined;
}
export const ALL_ICON_NAMES = Object.entries(ICON_CATEGORIES)
    .flatMap(([category, names]) => names.map((name) => ({ name, category })))
    .filter((entry) => !!getIconComponent(entry.name));
export function toPascalName(name) {
    return name;
}
export function toKebabName(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}
