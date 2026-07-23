import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServiceUserOption {
  id: string;
  firstName: string;
  lastName: string;
}

const UNSET = "__NONE__";

interface ServiceUserSelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  clients: ServiceUserOption[];
  defaultServiceUserId?: string;
  defaultServiceUserName?: string;
}

/**
 * Optional "Service User" picker used by forms that can either be linked to a
 * client or not (incident / medication error reports). When a
 * defaultServiceUserId is supplied (e.g. the form was opened from a client's
 * profile), the field is shown as a read-only summary instead of a select.
 */
export function ServiceUserSelectField<T extends FieldValues>({
  control,
  clients,
  defaultServiceUserId,
  defaultServiceUserName,
}: ServiceUserSelectFieldProps<T>) {
  if (defaultServiceUserId) {
    return (
      <div className="rounded-md border px-4 py-3 text-sm bg-muted/30">
        <span className="text-muted-foreground">Service user: </span>
        <span className="font-medium">{defaultServiceUserName}</span>
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name={"serviceUserId" as Path<T>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Service User (optional)</FormLabel>
          <Select
            onValueChange={(value) =>
              field.onChange(value === UNSET ? "" : value)
            }
            value={field.value || UNSET}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select service user…" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={UNSET}>
                — Not linked to a service user —
              </SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
