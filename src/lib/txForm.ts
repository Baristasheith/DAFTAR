import { localInputToDate, parseAmount } from "./format";

export type TxInput = {
  type: "income" | "expense";
  title: string;
  category: string;
  amount: number;
  description: string | null;
  notes: string | null;
  occurred_at: string;
};

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export function parseTxForm(fd: FormData): { value: TxInput } | { error: string } {
  const type = str(fd, "type");
  if (type !== "income" && type !== "expense") return { error: "اختر نوع العملية: مصروف أو وارد." };

  const title = str(fd, "title");
  if (!title) return { error: "اكتب اسم الغرض أو السلعة." };
  if (title.length > 120) return { error: "اسم الغرض طويل جداً (الحد 120 حرفاً)." };

  const category = str(fd, "category");
  if (!category) return { error: "اختر التصنيف." };
  if (category.length > 40) return { error: "اسم التصنيف طويل جداً." };

  const amount = parseAmount(str(fd, "amount"));
  if (amount === null) return { error: "المبلغ غير صالح: أدخل عدداً صحيحاً أكبر من صفر بالدينار، دون كسور." };

  const description = str(fd, "description");
  const notes = str(fd, "notes");
  if (description.length > 1000 || notes.length > 1000) return { error: "الوصف أو الملاحظات أطول من 1000 حرف." };

  const when = localInputToDate(str(fd, "occurred_at"));
  if (!when) return { error: "التاريخ والوقت غير صالحين." };
  if (when.getTime() > Date.now() + 24 * 3600 * 1000) return { error: "لا يمكن تسجيل عملية بتاريخ بعد أكثر من يوم." };

  return {
    value: {
      type, title, category, amount,
      description: description || null,
      notes: notes || null,
      occurred_at: when.toISOString(),
    },
  };
}
