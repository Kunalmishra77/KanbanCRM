import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateEmployee } from "@/lib/queries";
import { Loader2 } from "lucide-react";

export function CreateEmployeeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("employee");
  
  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const handleCreate = () => {
    if (!firstName || !lastName) return;

    createEmployee(
      { firstName, lastName, email, userType },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFirstName("");
          setLastName("");
          setEmail("");
          setUserType("employee");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] macos-card border-none bg-white/80 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Invite a new member to access the KanbanCRM dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>First Name</Label>
            <Input 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              placeholder="e.g. John"
              className="bg-white/60"
            />
          </div>
          <div className="grid gap-2">
            <Label>Last Name</Label>
            <Input 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              placeholder="e.g. Doe"
              className="bg-white/60"
            />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="e.g. john@example.com"
              className="bg-white/60"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="bg-white/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="co-founder">Owner / Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!firstName || !lastName || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
