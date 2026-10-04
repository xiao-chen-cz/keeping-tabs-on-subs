/** Intro paragraph of the cancel page: what recording a cancellation does, the vendor's cancel link, and which login to use. */
export function CancelIntro({ cancelUrl, accountLabel }: { cancelUrl: string | null; accountLabel: string | null }) {
  return (
    <div className="text-sm text-mid">
      <p>
        This records that you cancelled with the vendor. It does not cancel anything for you.
        {cancelUrl && (
          <>
            {" "}
            <a href={cancelUrl} target="_blank" rel="noopener noreferrer" className="link">
              Open the vendor&apos;s cancel link
            </a>
          </>
        )}
      </p>
      {accountLabel && <p className="mt-1">Sign in as {accountLabel} to cancel.</p>}
    </div>
  );
}
