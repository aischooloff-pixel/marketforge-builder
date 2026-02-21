import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Users, ShoppingCart, CreditCard, RotateCcw, Gavel, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

const Section = ({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) => (
  <div className="mb-8">
    <div className="flex items-start gap-2 mb-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <h2 className="text-base md:text-lg font-semibold">{title}</h2>
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-border break-words">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const TermsPage = () => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 pt-20 pb-24">
        <div className="container mx-auto px-4 max-w-3xl overflow-hidden break-words">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-6 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bevel-raised bg-card">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Пользовательское соглашение</h1>
            </div>

            <p className="text-muted-foreground mb-8 text-sm md:text-base leading-relaxed">
              Настоящее Пользовательское соглашение (далее — «Оферта») является публичной офертой в соответствии со ст.
              437 Гражданского кодекса РФ и определяет условия использования платформы TEMKA.STORE.
            </p>

            <Section
              icon={FileText}
              title="1. Общие положения"
              items={[
                "Настоящее соглашение считается заключённым с момента начала использования платформы (акцепт оферты в соответствии с п. 3 ст. 438 ГК РФ).",
                "Администрация оставляет за собой право изменять условия настоящего соглашения с уведомлением пользователей через сервис.",
                "Продолжение использования платформы после изменения условий означает согласие с новой редакцией.",
                "Все товары и услуги предоставляются «как есть» (as is).",
              ]}
            />

            <Section
              icon={Users}
              title="2. Стороны соглашения"
              items={[
                "Продавец — администрация платформы TEMKA.STORE, предоставляющая цифровые товары и услуги.",
                "Покупатель — дееспособное физическое лицо, достигшее 18 лет, авторизованное через Telegram.",
                "Авторизуясь на платформе, Покупатель подтверждает свою дееспособность и достижение совершеннолетия.",
              ]}
            />

            <Section
              icon={ShoppingCart}
              title="3. Предмет соглашения"
              items={[
                "Продавец предоставляет Покупателю доступ к цифровым товарам и услугам, описанным в каталоге платформы.",
                "Характеристики товаров указаны на страницах каталога и в описании товаров.",
                "Товары предназначены исключительно для целей, указанных в описании и не противоречащих законодательству РФ.",
              ]}
            />

            <Section
              icon={CreditCard}
              title="4. Оплата и ценообразование"
              items={[
                "Цены на товары указаны в российских рублях.",
                "Оплата осуществляется через криптоплатёжные системы (CryptoBot, xRocket) или с внутреннего баланса.",
                "Товар считается оплаченным после подтверждения платежа платёжной системой.",
                "Администрация вправе изменять цены без предварительного уведомления. Ранее оплаченные заказы пересчёту не подлежат.",
              ]}
            />

            <Section
              icon={RotateCcw}
              title="5. Возврат и обмен"
              items={[
                "Возврат средств осуществляется на внутренний баланс в случае, если товар неработоспособен или не соответствует описанию.",
                "Для инициации возврата необходимо обратиться в службу поддержки в течение 72 часов с момента покупки.",
                "Возврат невозможен, если товар был использован, активирован или передан третьим лицам.",
                "Администрация рассматривает заявки на возврат в течение 72 часов с момента покупки.",
                "В соответствии со ст. 26.1 Закона РФ «О защите прав потребителей», покупатель имеет право отказаться от товара до его получения.",
              ]}
            />

            <Section
              icon={Gavel}
              title="6. Ответственность сторон"
              items={[
                "Покупатель несёт полную ответственность за использование приобретённых товаров и услуг.",
                "Администрация не несёт ответственности за убытки, связанные с использованием товаров не по назначению.",
                "Администрация не гарантирует бесперебойную работу сервиса и не несёт ответственности за технические сбои.",
                "Споры разрешаются путём переговоров. При невозможности — в соответствии с законодательством РФ.",
              ]}
            />

            <Section
              icon={AlertTriangle}
              title="7. Блокировка и ограничения"
              items={[
                "Администрация вправе заблокировать аккаунт пользователя при нарушении условий соглашения без предварительного уведомления.",
                "При блокировке средства на внутреннем балансе замораживаются до выяснения обстоятельств.",
                "Повторная регистрация заблокированного пользователя запрещена.",
                "Администрация вправе установить лимиты на количество покупок одним пользователем.",
              ]}
            />

            <Card className="p-5 mt-8 border-primary/30 bg-primary/5">
              <p className="text-sm font-medium text-primary mb-2">⚖️ Юридическая сила</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Настоящее соглашение является юридически обязывающим документом в соответствии со ст. 434, 437, 438 ГК
                РФ. Факт использования платформы подтверждает полное и безоговорочное принятие всех условий настоящего
                соглашения.
              </p>
            </Card>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Последнее обновление:{" "}
              {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;