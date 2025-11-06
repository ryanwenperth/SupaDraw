import { useQuery } from "@tanstack/react-query";
import { createNewPage, deletePage, getPages } from "../db/draw";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Loader from "@/components/Loader";
import NoData from "./NoData";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Share2, Crown } from "lucide-react";
import TitleBar from "@/components/TitleBar";
import { getLocalUser, isWriter } from "@/db/auth";
import { useState, useEffect } from "react";
function NewPageOptionDropdown({
  createPageFn,
  createMermaidPageFn,
}: {
  createPageFn: () => void;
  createMermaidPageFn: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-Arial">
          + New Page
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={createPageFn}>Plain Page</DropdownMenuItem>
        <DropdownMenuItem onClick={createMermaidPageFn}>
          Mermaid Syntax Diagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Pages() {
  const navigate = useNavigate();
  const [canCreatePages, setCanCreatePages] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const writerStatus = await isWriter();
      setCanCreatePages(writerStatus);
    }
    checkRole();
  }, []);

  const { data: user_session } = useQuery({
    queryKey: ["user-session"],
    queryFn: () => getLocalUser(),
  });

  const {
    data,
    isLoading,
    refetch: refetchPages,
  } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const user_session = await getLocalUser();
      if (!user_session.error) {
        if (!user_session.data.session) {
          toast.error("Something went wrong!");
          return { data: null, error: null };
        }
        return getPages(user_session?.data.session.user?.id ?? "", true);
      }
      return null;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (data?.error) {
    toast(data.error.message);
  }

  if (isLoading) return <Loader />;

  function goToPage(id: string) {
    navigate({ to: "/page/$id", params: { id: id } });
  }

  async function createPage() {
    const data = await createNewPage();

    if (data.data && data.data[0]?.page_id) {
      goToPage(data.data[0].page_id);
      toast("Successfully created a new page!");
    }

    if (data.error) {
      toast("An error occured", {
        description: `Error: ${data.error.message}`,
      });
    }
  }

  async function createMermaidPage() {
    navigate({ to: "/mermaid" });
  }

  async function handlePageDelete(id: string) {
    const data = await deletePage(id);

    if (data.data === null) {
      toast("Successfully deleted the page!");
      refetchPages();
    }
    if (data.error) {
      toast("An error occured", {
        description: `Error: ${data.error.message}`,
      });
    }
  }

  return (
    <div className="mx-2 my-3 h-full w-full">
      <TitleBar
        title="Instructions"
        extra={
          canCreatePages ? (
            <NewPageOptionDropdown
              createPageFn={createPage}
              createMermaidPageFn={createMermaidPage}
            />
          ) : null
        }
      />
      <div className="flex flex-wrap gap-3 py-1">
        {data?.data && data.data.length > 0 ? (
          // data?.data?.map((page) => (
          //   <Card
          //     key={page.page_id}
          //     className="group h-fit max-h-28 w-fit max-w-72 cursor-pointer p-1 px-2 pt-2"
          //   >
          //     <div onClick={() => goToPage(page.page_id)}>
          //       <CardContent className="flex w-full flex-col justify-end gap-3 py-2 text-sm">
          //         <CardTitle className="line-clamp-1 flex items-center gap-2 font-virgil">
          //           {page.name}
          //           {page.user_id !== user_session?.data.session?.user?.id && (
          //             <Share2 className="h-3 w-3 text-gray-500" />
          //           )}
          //         </CardTitle>
          //         <h1 className="font-medium">
          //           Last updated on:{" "}
          //           {dayjs(page.updated_at).format("MMM DD, YYYY")}
          //         </h1>
          //       </CardContent>
          //     </div>
          //     {/* Only show delete for owned pages */}
          //     {page.user_id === user_session?.data.session?.user?.id && (
          //       <div className="flex w-full items-end justify-end p-0.5">
          //         <Trash2
          //           className="invisible h-4 w-4 cursor-pointer rounded-lg text-gray-600 transition-all hover:bg-gray-100 hover:text-red-500 group-hover:visible hover:dark:bg-gray-900"
          //           strokeWidth={3}
          //           onClick={() => handlePageDelete(page.page_id)}
          //         />
          //       </div>
          //     )}
          //   </Card>
          // ))

          // data?.data?.map((page) => (
          //   <Card
          //     key={page.page_id}
          //     className="group h-fit max-h-28 w-fit max-w-72 cursor-pointer p-1 px-2 pt-2"
          //   >
          //     <div onClick={() => goToPage(page.page_id)}>
          //       <CardContent className="flex w-full flex-col justify-end gap-3 py-2 text-sm">
          //         <CardTitle className="font-Arial line-clamp-1">
          //           {page.name}
          //         </CardTitle>
          //         <h1 className="font-medium">
          //           Last updated on:{" "}
          //           {dayjs(page.updated_at).format("MMM DD, YYYY")}
          //         </h1>
          //       </CardContent>
          //     </div>

          //     {/* <div className="flex w-full items-end justify-end p-0.5">
          //       <Trash2
          //         className="invisible h-4 w-4 cursor-pointer rounded-lg text-gray-600 transition-all hover:bg-gray-100 hover:text-red-500 group-hover:visible hover:dark:bg-gray-900"
          //         strokeWidth={3}
          //         onClick={() => handlePageDelete(page.page_id)}
          //       />
          //   </div> */}
          //   </Card>
          // ))

          data?.data?.map((page) => {
            const isOwned =
              page.user_id === user_session?.data.session?.user?.id;
            const isViewOnly = !isOwned && page.permission === "view";
            const isEditShared = !isOwned && page.permission === "edit";

            return (
              <Card
                key={page.page_id}
                className={`group h-auto w-72 cursor-pointer p-1 px-2 pt-2 ${
                  isOwned
                    ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
                    : isViewOnly
                      ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20"
                      : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20"
                }`}
              >
                <div onClick={() => goToPage(page.page_id)}>
                  <CardContent className="flex w-full flex-col justify-end gap-3 py-2 text-sm">
                    <div className="flex w-full items-start gap-2 overflow-hidden">
                      <h3
                        className="font-arial min-w-0 flex-1 break-words font-semibold tracking-tight"
                        style={{
                          fontSize: "clamp(0.875rem, 2vw, 1.5rem)",
                          lineHeight: "1.3",
                        }}
                      >
                        {page.name}
                      </h3>

                      {isOwned ? (
                        <div className="mt-1 flex flex-shrink-0 items-center gap-1">
                          <Crown className="h-3 w-3 flex-shrink-0 text-red-500" />
                          <span className="whitespace-nowrap text-xs text-red-600 dark:text-red-400">
                            owned
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-shrink-0 items-center gap-1">
                          <Share2
                            className={`h-3 w-3 flex-shrink-0 ${
                              isViewOnly ? "text-yellow-500" : "text-blue-500"
                            }`}
                          />
                          <span
                            className={`whitespace-nowrap text-xs ${
                              isViewOnly
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {page.permission}
                          </span>
                        </div>
                      )}
                    </div>

                    <h1 className="font-medium">
                      Last updated on:{" "}
                      {dayjs(page.updated_at).format("hh:mm A, MMM DD, YYYY")}
                    </h1>
                  </CardContent>
                </div>

                {isOwned && (
                  <div className="flex w-full items-end justify-end p-0.5">
                    <Trash2
                      className="invisible h-4 w-4 cursor-pointer rounded-lg text-gray-600 transition-all hover:bg-gray-100 hover:text-red-500 group-hover:visible hover:dark:bg-gray-900"
                      strokeWidth={3}
                      onClick={() => handlePageDelete(page.page_id)}
                    />
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <NoData name="Pages" />
        )}
      </div>
    </div>
  );
}
