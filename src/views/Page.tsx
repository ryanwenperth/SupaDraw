import { useEffect, useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Loader from "@/components/Loader";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Excalidraw, WelcomeScreen } from "excalidraw-monorepo";
import { NonDeletedExcalidrawElement } from "excalidraw-monorepo/element/types";
import {
  ExcalidrawImperativeAPI,
  BinaryFiles,
} from "excalidraw-monorepo/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { getDrawData, setDrawData } from "@/db/draw";
import { drawDataStore } from "@/stores/drawDataStore";

import { ShareDialog } from "@/components/ShareDialog";
import { getLocalUser } from "@/db/auth";
import { supabase } from "@/db/supabase";
import { uploadFileToStorage, downloadFileFromStorage } from "@/db/draw";
type PageProps = {
  id: string;
};

export default function Page({ id }: PageProps) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["page", id],
    queryFn: () => getDrawData(id),
  });

  const mutation = useMutation({
    mutationFn: (data: {
      elements: NonDeletedExcalidrawElement[];
      name: string;
      files?: BinaryFiles;
    }) => setDrawData(id, data.elements, data.name, data.files),
    onSuccess: () => {
      setIsSaving(false);
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast("An error occurred while saving to the server", {
        description: error.message,
      });
    },
  });

  const { mutate } = mutation;
   
  async function updateScene() {  
    if (data?.data && excalidrawAPI) {  
      const pageData = data.data[0].page_elements;  
      const elements = pageData.elements || [];  
      const fileMetadata = pageData.files || {};  
      const ownerId = data.data[0].user_id;  // Get owner ID from page data  
        
      // First, update scene with elements (without files)  
      excalidrawAPI.updateScene({  
        elements: elements,  
        appState: { theme: theme },  
      });  
      console.log("ownerId is : ",`${ownerId}/${id}`);
      // Then, load files from storage using OWNER'S ID  
      if (Object.keys(fileMetadata).length > 0) {  
        const loadedFiles: BinaryFiles = {};  
          
        for (const [fileId, metadata] of Object.entries(fileMetadata)) {  
          try {  
            
            // Use OWNER'S ID to construct path  
            const storagePath = `${ownerId}/${id}/${fileId}`;  
            console.log("storagePath is : ",storagePath);
              
            // Download from storage  
            const { data: blob, error } = await supabase.storage  
              .from('drawing-files')  
              .download(storagePath);  
              
            if (error) throw error;  
              
            // Convert blob to data URL  
            const dataURL = await new Promise<string>((resolve) => {  
              const reader = new FileReader();  
              reader.onloadend = () => resolve(reader.result as string);  
              reader.readAsDataURL(blob);  
            });  
              
            // Add to loaded files  
            loadedFiles[fileId] = {  
              ...metadata,  
              dataURL: dataURL,  
            };  
          } catch (error) {  
            console.error(`Failed to load file ${fileId}:`, error);  
          }  
        }  
          
        // Add all loaded files to canvas  
        if (Object.keys(loadedFiles).length > 0) {  
          excalidrawAPI.addFiles(Object.values(loadedFiles));  
        }  
      }  
        
      setName(data.data[0].name);  
    }  
    if (data?.error) {  
      toast("An error occurred", { description: data.error.message });  
    }  
  }

  // const setSceneData = useCallback(async () => {
  //   if (excalidrawAPI) {
  //     const scene = excalidrawAPI.getSceneElements();
  //     const files = excalidrawAPI.getFiles();
  //     const updatedAt = new Date().toISOString();

  //     const existingData = drawDataStore.getState().getPageData(id);

  //     if (
  //       JSON.stringify(existingData?.elements) !== JSON.stringify(scene) ||
  //       JSON.stringify(existingData?.files) !== JSON.stringify(files)
  //     ) {
  //       setIsSaving(true);
  //       // Save locally first
  //       drawDataStore.getState().setPageData(id, scene, updatedAt, name, files);

  //       // Then push to API
  //       mutate(
  //         {
  //           elements: scene as NonDeletedExcalidrawElement[],
  //           name,
  //           files,
  //         },
  //         {
  //           onSettled() {
  //             setIsSaving(false);
  //           },
  //         },
  //       );
  //     }
  //   }
  // }, [excalidrawAPI, id, name, mutate]);

  
  const setSceneData = useCallback(async () => {  
  if (excalidrawAPI) {  
    const scene = excalidrawAPI.getSceneElements();  
    const files = excalidrawAPI.getFiles();  
    const updatedAt = new Date().toISOString();  
      
    const existingData = drawDataStore.getState().getPageData(id);  
      
    if (JSON.stringify(existingData?.elements) !== JSON.stringify(scene) ||  
        JSON.stringify(existingData?.files) !== JSON.stringify(files)) {  
      setIsSaving(true);  
        
      try {  
        const fileMetadata: Record<string, any> = {};  
        const ownerId = data?.data?.[0]?.user_id; // Get owner ID from page data  
          
        // Only upload NEW files (not already in storage)  
        for (const [fileId, file] of Object.entries(files)) {  
          const storagePath = `${ownerId}/${id}/${fileId}`;  
            
          // Check if file already exists in metadata  
          if (existingData?.files?.[fileId]?.storagePath === storagePath) {  
            // File already uploaded, reuse existing metadata  
            fileMetadata[fileId] = existingData.files[fileId];  
          } else {  
            // New file, upload to storage  
            const dataURL = file.dataURL;  
            const base64Data = dataURL.split(',')[1];  
            const blob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));  
              
            const { error: uploadError } = await supabase.storage  
              .from('drawing-files')  
              .upload(storagePath, blob, {  
                contentType: file.mimeType,  
                upsert: false // Don't overwrite existing files  
              });  
              
            if (uploadError) {  
              console.error('Upload error:', uploadError);  
              throw uploadError;  
            }  
              
            fileMetadata[fileId] = {  
              id: fileId,  
              created: file.created,  
              mimeType: file.mimeType,  
              storagePath: storagePath,  
              lastRetrieved: file.lastRetrieved  
            };  
          }  
        }  
          
        // Save locally first  
        drawDataStore.getState().setPageData(id, scene, updatedAt, name, fileMetadata);  
          
        // Then push to API  
        mutate(  
          {  
            elements: scene as NonDeletedExcalidrawElement[],  
            name,  
            files: fileMetadata,  
          },  
          {  
            onSettled() {  
              setIsSaving(false);  
            },  
          },  
        );  
      } catch (error) {  
        console.error("Save error:", error);  
        toast("Failed to save", {  
          description: error instanceof Error ? error.message : "Unknown error"  
        });  
        setIsSaving(false);  
      }  
    }  
  }  
}, [excalidrawAPI, id, name, mutate, data]);


  useEffect(() => {
    if (!isLoading && data?.data && excalidrawAPI) {
      setTimeout(updateScene, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data, excalidrawAPI]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSceneData();
    }, 30000);

    return () => clearInterval(interval);
  }, [setSceneData]);

  // useEffect(() => {
  //   // Load data from local storage if available
  //   const localData = drawDataStore.getState().getPageData(id);
  //   if (localData && excalidrawAPI) {
  //     excalidrawAPI.updateScene({
  //       elements: localData.elements,
  //       appState: { theme: theme },
  //     });

  //     // Load files if they exist
  //     if (localData.files && Object.keys(localData.files).length > 0) {
  //       excalidrawAPI.addFiles(Object.values(localData.files));
  //     }

  //     setName(localData.name);
  //   }
  // }, [id, excalidrawAPI, theme]);

   
  useEffect(() => {  
    // Load data from local storage if available  
    const localData = drawDataStore.getState().getPageData(id);  
    if (localData && excalidrawAPI) {  
      excalidrawAPI.updateScene({  
        elements: localData.elements,  
        appState: { theme: theme },  
      });  
        
      // Load files from storage (not from local storage)  
      if (localData.files && Object.keys(localData.files).length > 0) {  
        const loadFilesAsync = async () => {  
          const loadedFiles: BinaryFiles = {};  
            
          for (const [fileId, metadata] of Object.entries(localData.files)) {  
            const { dataURL, error } = await downloadFileFromStorage(metadata.storagePath);  
              
            if (dataURL) {  
              loadedFiles[fileId] = {  
                id: fileId,  
                dataURL: dataURL,  
                mimeType: metadata.mimeType,  
                created: metadata.created,  
                lastRetrieved: Date.now()  
              };  
            }  
          }  
            
          if (Object.keys(loadedFiles).length > 0) {  
            excalidrawAPI.addFiles(Object.values(loadedFiles));  
          }  
        };  
          
        loadFilesAsync();  
      }  
        
      setName(localData.name);  
    }  
  }, [id, excalidrawAPI, theme]);

  // Add query to get current user
  const { data: userSession } = useQuery({
    queryKey: ["user-session"],
    queryFn: () => getLocalUser(),
  });

  // Check if current user owns this page
  const isOwner =
    data?.data?.[0]?.user_id === userSession?.data.session?.user?.id;

  return (
    <div className="flex w-full flex-col">
      <div className="h-full w-full">
        {isLoading ? (
          <Loader />
        ) : (
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={{ appState: { theme: theme } }}
            renderTopRightUI={() => (
              <div className="flex gap-2">
                <ShareDialog pageId={id} isOwner={isOwner} />

                {/* <Input
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  className="h-9 w-40"
                  placeholder="Page Title"
                /> */}
                <Button
                  variant="secondary"
                  onClick={setSceneData}
                  disabled={isSaving}
                  size="sm"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                {/* <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={updateScene}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Refreshes the page. This removes any unsaved changes.
                        Use with caution.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider> */}


              </div>
            )}
            theme={theme === "dark" ? "dark" : "light"}
            autoFocus
          >
            <WelcomeScreen />
          </Excalidraw>
        )}
      </div>
    </div>
  );
}
