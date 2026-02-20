import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none active:translate-x-px active:translate-y-px font-sans",
  {
    variants: {
      variant: {
        default:
          "bg-background text-foreground shadow-win95-raised border-0 active:shadow-win95-sunken",
        destructive:
          "bg-background text-destructive shadow-win95-raised border-0 active:shadow-win95-sunken",
        outline:
          "bg-background text-foreground shadow-win95-raised border-0 active:shadow-win95-sunken",
        secondary:
          "bg-background text-foreground shadow-win95-raised border-0 active:shadow-win95-sunken",
        ghost:
          "bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground border-0",
        link: "text-primary underline-offset-4 hover:underline border-0 shadow-none",
        win95primary:
          "bg-primary text-primary-foreground shadow-win95-raised border-0 active:shadow-win95-sunken",
      },
      size: {
        default: "h-8 px-4 py-1",
        sm: "h-7 px-3 py-0.5 text-xs",
        lg: "h-9 px-6 py-1",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
