export function resolveProviderClasses(provider, variant) {
    switch (provider) {
        case "google":
            if (variant === "dark") {
                return "bg-neutral-900 text-neutral-foreground border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700";
            }
            if (variant === "neutral") {
                return "bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700";
            }
            return "bg-background text-foreground border border-border hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3";
        case "apple":
            if (variant === "white") {
                return "bg-background text-foreground border border-transparent hover:bg-elevation-2 active:bg-elevation-3";
            }
            if (variant === "outline") {
                return "bg-transparent text-foreground border border-border hover:bg-elevation-2 active:bg-elevation-3";
            }
            return "bg-neutral-950 text-neutral-foreground border border-neutral-900 hover:bg-neutral-900 active:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:border-white dark:hover:bg-neutral-100";
        case "github":
            if (variant === "outline" || variant === "light" || variant === "white") {
                return "bg-transparent text-foreground border border-border hover:bg-elevation-2 active:bg-elevation-3";
            }
            return "bg-neutral-900 text-neutral-foreground border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700";
        case "microsoft":
            if (variant === "dark" || variant === "black") {
                return "bg-neutral-900 text-neutral-foreground border border-neutral-800 hover:bg-neutral-800 active:bg-neutral-700";
            }
            return "bg-background text-foreground border border-border hover:bg-elevation-2 active:bg-elevation-3";
    }
}
