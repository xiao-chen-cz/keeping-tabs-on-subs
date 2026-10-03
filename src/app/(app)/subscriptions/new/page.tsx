import { SubscriptionForm } from "@/components/subscription-form";
import { emptyFormValues } from "@/components/subscription-form-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { createSubscriptionAction } from "../actions";

export default async function NewSubscriptionPage() {
  await requireUser();
  const [categories, paymentMethods] = await Promise.all([listCategories(), listPaymentMethods()]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add subscription</h1>
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
