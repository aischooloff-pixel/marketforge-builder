import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { PxQuestion, PxFolder, PxFolderOpen, PxArrowDown } from "@/components/PixelIcons";

const faqData = [
  {
    question: "Как работает автовыдача?",
    answer:
      "После оплаты товар выдаётся автоматически — моментально получаешь данные товаров. Без ожидания, без посредников.",
  },
  {
    question: "Какие способы оплаты?",
    answer: "Крипта через CryptoBot и xRocket. Также можно оплатить с баланса — пополняется в профиле.",
  },
  {
    question: "Что делать при проблеме с товаром?",
    answer: "Открывай диспут через саппорт в приложении или пиши админу в Telegram. Разберёмся быстро.",
  },
  {
    question: "Есть ли возврат?",
    answer: "Да, через админа. Если товар нерабочий или не соответствует — средства вернутся на баланс. Без кидалова.",
  },
  {
    question: "Как работает мини-апп?",
    answer: "Прямо внутри Telegram — каталог, оплата, баланс, история. Никуда не переходишь, всё в одном месте.",
  },
];

const FaqItem = ({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof faqData)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="mb-4 cursor-pointer"
      onClick={onToggle}
    >
      <div className={`win95-window transition-colors ${isOpen ? "bg-secondary" : ""}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 pr-4">
            {isOpen ? <PxFolderOpen size={16} /> : <PxFolder size={16} />}
            <p className="text-foreground font-medium text-sm md:text-base">{item.question}</p>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
            <PxArrowDown size={12} />
          </motion.div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number>(-1);

  return (
    <section className="py-10 md:py-20 bg-secondary/30 criminal-pattern">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-6 md:mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <PxQuestion size={20} />
            <span className="text-sm text-muted-foreground font-medium">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">F.A.Q.</h2>
          <p className="text-sm md:text-base text-muted-foreground">Читай перед покупкой</p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {faqData.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex((prev) => (prev === index ? -1 : index))}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
