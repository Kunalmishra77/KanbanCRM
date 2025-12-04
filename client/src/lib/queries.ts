import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsAPI, storiesAPI, commentsAPI, activityAPI } from "./api";
import { useToast } from "@/hooks/use-toast";

// Clients queries
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: clientsAPI.getAll,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsAPI.getOne(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: clientsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Client created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create client", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Client updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update client", description: error.message, variant: "destructive" });
    },
  });
}

// Stories queries
export function useStories(clientId?: string) {
  return useQuery({
    queryKey: clientId ? ['stories', 'client', clientId] : ['stories'],
    queryFn: () => storiesAPI.getAll(clientId),
  });
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ['stories', id],
    queryFn: () => storiesAPI.getOne(id),
    enabled: !!id,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: storiesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'stories' && query.queryKey[1] === 'client'
      });
      toast({ title: "Story created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create story", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storiesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// Comments queries
export function useComments(storyId: string) {
  return useQuery({
    queryKey: ['comments', storyId],
    queryFn: () => commentsAPI.getByStory(storyId),
    enabled: !!storyId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: any }) => 
      commentsAPI.create(storyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.storyId] });
      toast({ title: "Comment added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
    },
  });
}

// Activity log queries
export function useActivityLog(limit = 10) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => activityAPI.getAll(limit),
  });
}
