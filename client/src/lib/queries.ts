import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsAPI, storiesAPI, commentsAPI, activityAPI, invoicesAPI, usersAPI, founderInvestmentsAPI, sentEmailsAPI, internalDocumentsAPI } from "./api";
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

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => clientsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'stories' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'comments' });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast({ title: "Client deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete client", description: error.message, variant: "destructive" });
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
      // Invalidate ALL story-related queries to ensure sync across all views
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'stories' });
      // Also invalidate clients (for average progress) and activity log (for Dashboard)
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
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
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => storiesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'stories' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'comments' });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Story deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete story", description: error.message, variant: "destructive" });
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

// Invoice queries
export function useInvoices(clientId: string) {
  return useQuery({
    queryKey: ['invoices', clientId],
    queryFn: () => invoicesAPI.getByClient(clientId),
    enabled: !!clientId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: any }) =>
      invoicesAPI.create(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast({ title: "Invoice added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add invoice", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invoicesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'invoices' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast({ title: "Invoice updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update invoice", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => invoicesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'invoices' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete invoice", description: error.message, variant: "destructive" });
    },
  });
}

// Users queries (for internal dashboard)
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAll,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });
}

// Founder Investment queries
export function useFounderInvestments() {
  return useQuery({
    queryKey: ['founder-investments'],
    queryFn: founderInvestmentsAPI.getAll,
  });
}

export function useCreateFounderInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: founderInvestmentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder-investments'] });
      toast({ title: "Investment added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add investment", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateFounderInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => founderInvestmentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder-investments'] });
      toast({ title: "Investment updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update investment", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteFounderInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => founderInvestmentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder-investments'] });
      toast({ title: "Investment deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete investment", description: error.message, variant: "destructive" });
    },
  });
}

// Sent Emails queries
export function useSentEmails(storyId: string) {
  return useQuery({
    queryKey: ['sent-emails', storyId],
    queryFn: () => sentEmailsAPI.getByStory(storyId),
    enabled: !!storyId,
  });
}

export function useCreateSentEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: any }) =>
      sentEmailsAPI.create(storyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sent-emails', variables.storyId] });
    },
  });
}

// Internal Documents queries
export function useInternalDocuments() {
  return useQuery({
    queryKey: ['internal-documents'],
    queryFn: internalDocumentsAPI.getAll,
  });
}

export function useCreateInternalDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: internalDocumentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
      toast({ title: "Document added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add document", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateInternalDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => internalDocumentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
      toast({ title: "Document updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update document", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteInternalDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => internalDocumentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-documents'] });
      toast({ title: "Document deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    },
  });
}
