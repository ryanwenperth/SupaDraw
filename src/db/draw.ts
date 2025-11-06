import { NonDeletedExcalidrawElement } from "excalidraw-monorepo/element/types";
import { BinaryFiles } from "excalidraw-monorepo/types";

import { supabase } from "./supabase";
import { AuthError, PostgrestError } from "@supabase/supabase-js";

export type DBResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[] | null;
  error: PostgrestError | AuthError | null;
};

export type ExcalidrawData = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState?: Record<string, unknown>;
  files?: BinaryFiles;
};

export const DB_NAME = "draw";

// export async function getPages(user_id: string): Promise<DBResponse> {
//   const { data, error } = await supabase
//     .from(DB_NAME)
//     .select()
//     .order("updated_at", { ascending: false })
//     .eq("user_id", user_id)
//     .eq("is_deleted", false);

//   return { data, error };
// }

export async function getPages(
  user_id: string,
  includeShared: boolean = true,
): Promise<DBResponse> {
  if (!includeShared) {
    // Original behavior - only owned pages
    const { data, error } = await supabase
      .from(DB_NAME)
      .select()
      .order("updated_at", { ascending: false })
      .eq("user_id", user_id)
      .eq("is_deleted", false);

    return { data, error };
  }

  // Fetch owned pages
  const { data: ownedPages, error: ownedError } = await supabase
    .from(DB_NAME)
    .select()
    .eq("user_id", user_id)
    .eq("is_deleted", false);

  if (ownedError) {
    return { data: null, error: ownedError };
  }

  // Fetch shared pages
  const { data: sharedPages, error: sharedError } = await supabase
    .from("draw_shares")
    .select(
      `  
      permission,  
      draw:page_id (  
        page_id,  
        user_id,  
        name,  
        created_at,  
        updated_at,  
        page_elements,  
        is_deleted  
      )  
    `,
    )
    .eq("shared_with_user_id", user_id);

  if (sharedError) {
    return { data: null, error: sharedError };
  }

  // Combine and flatten results
  const sharedDrawings =
    sharedPages
      ?.map((share: any) => ({
        ...share.draw,
        permission: share.permission, // Add this
      }))
      .filter((draw: any) => draw && !draw.is_deleted) || [];

  const allPages = [...(ownedPages || []), ...sharedDrawings];

  // Sort by updated_at
  allPages.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return { data: allPages, error: null };
}

export async function getDrawData(id: string): Promise<DBResponse> {
  const { data, error } = await supabase
    .from(DB_NAME)
    .select()
    .eq("page_id", id);

  return { data, error };
}

export async function createNewPage(
  elements?: readonly NonDeletedExcalidrawElement[],
  files?: BinaryFiles,
): Promise<DBResponse> {
  const { data: profile, error: profileError } = await supabase.auth.getUser();
  if (profile) {
    const excalidrawData: ExcalidrawData = {
      elements: elements || [],
      files: files || {},
    };
    const { data, error } = await supabase
      .from(DB_NAME)
      .insert({ user_id: profile.user?.id, page_elements: excalidrawData })
      .select();
    return { data, error };
  }
  return { data: null, error: profileError };
}

export async function setDrawData(
  id: string,
  elements: readonly NonDeletedExcalidrawElement[],
  name: string,
  files?: BinaryFiles,
): Promise<DBResponse> {
  const updateTime = new Date().toISOString();
  const excalidrawData: ExcalidrawData = {
    elements,
    files: files || {},
  };
  const { data, error } = await supabase
    .from(DB_NAME)
    .update({
      name: name,
      page_elements: excalidrawData,
      updated_at: updateTime,
    })
    .eq("page_id", id)
    .select();

  return { data, error };
}

export async function deletePage(id: string): Promise<DBResponse> {
  const { error } = await supabase
    .from(DB_NAME)
    .update({ is_deleted: true })
    .eq("page_id", id);

  return { data: null, error };
}

export async function getSharedPages(): Promise<DBResponse> {
  const { data: profile } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("draw")
    .select(
      `  
      *,  
      draw_shares!inner(permission)  
    `,
    )
    .eq("draw_shares.shared_with_user_id", profile.user?.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return { data, error };
}

export async function sharePage(
  pageId: string,
  sharedWithEmail: string,
  permission: "view" | "edit" = "view",
): Promise<DBResponse> {
  const { data: profile } = await supabase.auth.getUser();

  // Use the admin API to list users and find by email
  const {
    data: { users },
    error: userError,
  } = await supabase.auth.admin.listUsers();

  if (userError) {
    return { data: null, error: userError };
  }

  const targetUser = users?.find((u) => u.email === sharedWithEmail);

  if (!targetUser) {
    return {
      data: null,
      error: new Error("User not found") as unknown as PostgrestError,
    };
  }

  const { data, error } = await supabase
    .from("draw_shares")
    .insert({
      page_id: pageId,
      shared_with_user_id: targetUser.id,
      shared_by_user_id: profile.user?.id,
      permission: permission,
    })
    .select();

  return { data, error };
}

// export async function removeShare(
//   pageId: string,
//   sharedWithUserId?: string,
// ): Promise<DBResponse> {
//   const { error } = await supabase
//     .from("draw_shares")
//     .delete()
//     .eq("page_id", pageId);
//   .eq("shared_with_user_id", sharedWithUserId);

//   return { data: null, error };
// }
export async function removeShare(params: {
  shareId: string;
  sharedWithUserId?: string; // Optional if not needed
}): Promise<DBResponse> {
  const { shareId } = params;

  const { data, error } = await supabase
    .from("draw_shares")
    .delete()
    .eq("id", shareId);

  return { data, error };
}

// export async function getPageShares(pageId: string): Promise<DBResponse> {
//   const { data, error } = await supabase
//     .from("draw_shares")
//     .select("*, auth.users(email)")
//     .eq("page_id", pageId);

//   return { data, error };
// }

export async function getPageShares(pageId: string): Promise<DBResponse> {
  const { data, error } = await supabase.rpc("get_page_shares_with_emails", {
    page_id_param: pageId,
  });

  return { data, error };
}

export async function updateSharePermission(
  pageId: string,
  sharedWithUserId: string,
  permission: "view" | "edit",
): Promise<DBResponse> {
  const { data, error } = await supabase
    .from("draw_shares")
    .update({ permission })
    .eq("page_id", pageId)
    .eq("shared_with_user_id", sharedWithUserId)
    .select();

  return { data, error };
}

// // Get all shares for a specific page with user emails
// export async function getPageShares(pageId: string): Promise<DBResponse> {
//   const { data, error } = await supabase.rpc("get_page_shares_with_emails", {
//     page_id_param: pageId,
//   });

//   return { data, error };
// }

// // Update share permission (toggle between view and edit)
// export async function updateSharePermission(params: {
//   shareId: string;
//   permission: "view" | "edit";
// }): Promise<DBResponse> {
//   const { shareId, permission } = params;

//   const { data, error } = await supabase
//     .from("draw_shares")
//     .update({ permission })
//     .eq("id", shareId)
//     .select();

//   return { data, error };
// }

// // Remove a share (revoke access)
// export async function removeShare(params: {
//   shareId: string;
// }): Promise<DBResponse> {
//   const { shareId } = params;

//   const { data, error } = await supabase
//     .from("draw_shares")
//     .delete()
//     .eq("id", shareId);

//   return { data, error };
// }

// // Share a page with a user by email
// export async function sharePage(
//   pageId: string,
//   sharedWithEmail: string,
//   permission: "view" | "edit" = "view",
// ): Promise<DBResponse> {
//   // Call the database function to look up user by email and create share
//   const { data, error } = await supabase.rpc("share_page_with_user", {
//     page_id_param: pageId,
//     email_param: sharedWithEmail,
//     permission_param: permission,
//   });

//   return { data, error };
// }
