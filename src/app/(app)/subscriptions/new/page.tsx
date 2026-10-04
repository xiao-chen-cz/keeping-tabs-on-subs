import { SubscriptionForm } from "@/components/subscription-form";
import { emptyFormValues } from "@/components/subscription-form-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { createSubscriptionAction } from "../actions";

export default async function NewSubscriptionPage() {
  await requireUser();
  const [categories, paymentMethods] = await Promise.all([listCategories(), listPaymentMethods()]);
  return (
    <main className="flex flex-1 flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Add subscription</h1>
      <SubscriptionForm
        mode="create"
        action={createSubscriptionAction}
        initialValues={{ ...emptyFormValues(), status: "confirmed" }}
        lookups={{ categories, paymentMethods }}
        cancelHref="/"
      />
    </main>
  );
}
