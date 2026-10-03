import { notFound } from "next/navigation";
import { SubscriptionForm } from "@/components/subscription-form";
import { formValuesFromSubscription } from "@/components/subscription-form-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { getSubscriptionForEdit } from "@/lib/dal/subscriptions";
import { updateSubscriptionAction } from "../../actions";

export default async function EditSubscriptionPage({ params }: PageProps<"/subscriptions/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const [existing, categories, paymentMethods] = await Promise.all([
    getSubscriptionForEdit(id),
    listCategories(),
    listPaymentMethods(),
  ]);
  if (!existing) notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit {existing.subscription.name}</h1>
      <SubscriptionForm
        mode="edit"
        action={updateSubscriptionAction.bind(null, id)}
        initialValues={formValuesFromSubscription(existing.subscription, existing)}
        lookups={{ categories, paymentMethods }}
        cancelHref={`/subscriptions/${id}`}
      />
    </main>
  );
}
