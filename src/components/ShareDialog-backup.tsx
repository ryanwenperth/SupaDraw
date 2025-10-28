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
  removeShare,
  updateSharePermission,
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

  // Fetch existing shares
  const { data: shares } = useQuery({
    queryKey: ["shares", pageId],
    queryFn: () => getPageShares(pageId),
    enabled: isOpen && isOwner,
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: () => sharePage(pageId, email, permission),
    onSuccess: () => {
      toast("Successfully shared!");
      setEmail("");
      setPermission("view");
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
    },
    onError: (error: Error) => {
      toast("Failed to share", { description: error.message });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: ({
      shareId,
      newPermission,
    }: {
      shareId: string;
      newPermission: "view" | "edit";
    }) => updateSharePermission(shareId, newPermission),
    onSuccess: () => {
      toast("Permission updated!");
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
    },
    onError: (error: Error) => {
      toast("Failed to update permission", { description: error.message });
    },
  });

  // Remove share mutation
  const removeMutation = useMutation({
    mutationFn: (shareId: string) => removeShare(shareId),
    onSuccess: () => {
      toast("Share removed!");
      queryClient.invalidateQueries({ queryKey: ["shares", pageId] });
    },
    onError: (error: Error) => {
      toast("Failed to remove share", { description: error.message });
    },
  });

  const handleShare = () => {
    if (!email.trim()) {
      toast("Please enter an email address");
      return;
    }
    shareMutation.mutate();
  };

  const togglePermission = (
    shareId: string,
    currentPermission: "view" | "edit",
  ) => {
    const newPermission = currentPermission === "view" ? "edit" : "view";
    updatePermissionMutation.mutate({ shareId, newPermission });
  };

  // Don't render for non-owners
  if (!isOwner) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Share Drawing</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Add new share form */}
        <div className="space-y-2 p-2">
          <Input
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8"
          />
          <div className="flex items-center gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "view" | "edit")}
              className="h-8 flex-1 rounded border px-2 text-sm"
            >
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
            </select>
            <Button
              size="sm"
              onClick={handleShare}
              disabled={shareMutation.isPending}
            >
              Share
            </Button>
          </div>
          <DropdownMenuSeparator />

          {/* List of shared users */}
          <div className="max-h-48 overflow-y-auto p-2">
            {shares?.data?.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between py-2"
              >
                {/* User info and permission controls */}
              </div>
            ))}
          </div>
        </div>

        {/* List existing shares */}
        {shares?.data && shares.data.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Shared with</DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {shares?.data?.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex-1">
                    <p className="text-sm">{share.shared_with_user_id}</p>
                    <p className="text-xs text-gray-500">{share.permission}</p>
                  </div>
                  <div className="flex gap-1">
                    {/* Permission toggle button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePermissionToggle(share)}
                    >
                      {share.permission === "view" ? <Eye /> : <Edit />}
                    </Button>
                    {/* Remove share button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {/* {shares.data.map((share: any) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {share.shared_with_user_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        togglePermission(share.id, share.permission)
                      }
                    >
                      {share.permission === "view" ? (
                        <Eye className="mr-1 h-3 w-3" />
                      ) : (
                        <Edit className="mr-1 h-3 w-3" />
                      )}
                      <span className="text-xs">{share.permission}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => removeMutation.mutate(share.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))} */}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
