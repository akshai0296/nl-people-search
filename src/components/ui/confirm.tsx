"use client";

import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";
import { Spinner } from "./misc";

/** Asks before something that can't be undone. */
export function Confirm({ trigger, title, description, confirmLabel, pending, onConfirm, open, onOpenChange }: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending && <Spinner />} {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
