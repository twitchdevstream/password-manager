import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { InsertPassword, Password, insertPasswordSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PasswordFormProps {
  password?: Password;
  onSuccess?: () => void;
}

export function PasswordForm({ password, onSuccess }: PasswordFormProps) {
  const { toast } = useToast();
  const form = useForm<InsertPassword>({
    resolver: zodResolver(insertPasswordSchema),
    defaultValues: {
      name: password?.name ?? "",
      username: password?.username ?? "",
      password: password?.password ?? "",
    },
  });

  const onSubmit = async (data: InsertPassword) => {
    try {
      if (password) {
        await apiRequest("PATCH", `/api/passwords/${password.id}`, data);
      } else {
        await apiRequest("POST", "/api/passwords", data);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/passwords"] });
      toast({
        title: "Success",
        description: `Password ${password ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${password ? "update" : "create"} password`,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {password ? "Update" : "Create"} Password
        </Button>
      </form>
    </Form>
  );
}
