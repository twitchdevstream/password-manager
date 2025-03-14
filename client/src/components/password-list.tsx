import { useQuery } from "@tanstack/react-query";
import { Password } from "@shared/schema";
import { PasswordEntry } from "./password-entry";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PasswordListProps {
  searchTerm: string;
}

interface PasswordResponse {
  passwords: Password[];
  total: number;
}

export function PasswordList({ searchTerm }: PasswordListProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery<PasswordResponse>({
    queryKey: ["/api/passwords", { page, limit }],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.passwords.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No passwords found. Add your first password entry!
      </div>
    );
  }

  const filteredPasswords = data.passwords.filter((password) =>
    password.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!filteredPasswords.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No passwords match your search.
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPasswords.map((password) => (
          <PasswordEntry key={password.id} password={password} />
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <Button 
          variant="outline" 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="py-2 px-4 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button 
          variant="outline"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}