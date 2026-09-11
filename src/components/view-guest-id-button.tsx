import { openGuestDocument } from "@/app/(dashboard)/dashboard/actions";
import { SubmitButton } from "@/components/submit-button";

export function ViewGuestIdButton({
  submissionId,
  next = "/dashboard/bookings",
}: {
  submissionId: string;
  next?: string;
}) {
  return (
    <form action={openGuestDocument}>
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton className="btn-secondary text-xs" pendingLabel="Opening…">
        View ID
      </SubmitButton>
    </form>
  );
}
