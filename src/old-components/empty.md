import -

```jsx
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { GhostIcon } from "lucide-react"
```

---

default -

```jsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <BuildingIcon />
    </EmptyMedia>
    <EmptyTitle>This is a title</EmptyTitle>
    <EmptyDescription>
      This is a description of the empty state. It can be multiple lines and
      will wrap as needed.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <div className="flex gap-2">
      <Button>Primary Action</Button>
      <Button variant="outline">Secondary Action</Button>
    </div>
  </EmptyContent>
</Empty>
```
