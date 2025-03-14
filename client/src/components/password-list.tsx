import { useQuery } from "@tanstack/react-query";
import { Password } from "@shared/schema";
import { PasswordEntry } from "./password-entry";
import { Loader2 } from "lucide-react";

interface PasswordListProps {
  searchTerm: string;
}

export function PasswordList({ searchTerm }: PasswordListProps) {
  const { data: passwords, isLoading } = useQuery<Password[]>({
    queryKey: ["/api/passwords"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!passwords?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No passwords found. Add your first password entry!
      </div>
    );
  }

  const filteredPasswords = passwords.filter((password) =>
    password.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!filteredPasswords.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No passwords match your search.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredPasswords.map((password) => (
        <PasswordEntry key={password.id} password={password} />
      ))}
    </div>
  );
}
