import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-[hsl(var(--border))] group-[.toaster]:shadow-[2px_2px_0px_hsl(var(--foreground)/0.3)] group-[.toaster]:rounded-none group-[.toaster]:font-mono group-[.toaster]:text-xs",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[11px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-none group-[.toast]:text-[10px] group-[.toast]:font-pixel group-[.toast]:shadow-[inset_-1px_-1px_0_hsl(var(--foreground)/0.25),inset_1px_1px_0_hsl(var(--background)/0.5)]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-none group-[.toast]:text-[10px]",
          success:
            "group-[.toaster]:border-[hsl(var(--primary))] group-[.toaster]:bg-[hsl(var(--primary)/0.08)]",
          error:
            "group-[.toaster]:border-[hsl(var(--destructive))] group-[.toaster]:bg-[hsl(var(--destructive)/0.08)]",
          title: "group-[.toast]:font-pixel group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-wider",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
