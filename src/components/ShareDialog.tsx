import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, X, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  sharePage,
  getPageShares,
  updateSharePermission,
  removeShare,
} from "@/db/draw";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type ShareDialogProps = {
  pageId: string;
  isOwner: boolean;
};

export function ShareDialog({ pageId, isOwner }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch shares list
  const { data: shares } = useQuery({
    queryKey: ["shares", pageId],
    queryFn: () => getPageShares(pageId),
    enabled: isOwner && isOpen,
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: (data: { email: string; permission: "view" | "edit" }) =>
      sharePage(pageId, data.email, data.permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
      setEmail("");
      setPermission("view");
      toast.success("Share request sent successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to share", { description: error.message });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: (params: {
      shareId: string;
      sharedWithUserId: string;
      permission: "view" | "edit";
    }) => updateSharePermission(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
      //toast.success(`Permission updated`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update permission", {
        description: error.message,
      });
    },
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: (params: { shareId: string }) => removeShare(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
      toast.success("Share removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove share", { description: error.message });
    },
  });

  if (!isOwner) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Share Drawing</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Share form */}
        <div className="space-y-2 p-2">
          <Input
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9"
          />

          {/* Permission selector */}
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="view"
                checked={permission === "view"}
                onChange={(e) =>
                  setPermission(e.target.value as "view" | "edit")
                }
              />
              <span className="text-sm">View</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="edit"
                checked={permission === "edit"}
                onChange={(e) =>
                  setPermission(e.target.value as "view" | "edit")
                }
              />
              <span className="text-sm">Edit</span>
            </label>
          </div>

          <Button
            onClick={() => shareMutation.mutate({ email, permission })}
            disabled={!email || shareMutation.isPending}
            className="w-full"
            size="sm"
          >
            {shareMutation.isPending ? "Sharing..." : "Share"}
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Shares list */}
        <div className="max-h-48 overflow-y-auto">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Shared with
          </DropdownMenuLabel>

          {shares?.data?.length === 0 ? (
            <div className="text-muted-foreground p-2 text-center text-sm">
              Not shared with anyone yet
            </div>
          ) : (
            shares?.data?.map((share: any) => (
              <div
                key={share.id}
                className="hover:bg-accent flex items-center justify-between p-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {share.shared_with_email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Permission toggle button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      const newPermission =
                        share.permission === "view" ? "edit" : "view";
                      updatePermissionMutation.mutate({
                        shareId: share.id,
                        sharedWithUserId: share.shared_with_email,
                        permission: newPermission,
                      });
                    }}
                  >
                    {share.permission === "view" ? (
                      <Eye className="mr-1 h-3 w-3" />
                    ) : (
                      <Edit className="mr-1 h-3 w-3" />
                    )}
                    <span className="text-xs">{share.permission}</span>
                  </Button>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      removeShareMutation.mutate({ shareId: share.id })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
