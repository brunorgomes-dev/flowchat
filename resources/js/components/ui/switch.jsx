import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  ...props
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 dark:bg-foreground"
          )}
        />
      </SwitchPrimitive.Root>
    </span>
  )
}

export { Switch }
