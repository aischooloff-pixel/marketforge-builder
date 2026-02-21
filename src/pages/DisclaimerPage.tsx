import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert, Scale, AlertTriangle, FileText, UserX, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const DisclaimerPage = () => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1 pt-20 pb-24">
        <div className="container mx-auto px-4 max-w-3xl overflow-hidden break-words">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-6 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-destructive/10">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Отказ от ответственности
              </h1>
            </div>

            <p className="text-muted-foreground mb-8 text-sm md:text-base leading-relaxed">
              Настоящий документ определяет условия использования товаров и услуг, 
              приобретённых на платформе TEMKA.STORE, и ограничивает ответственность 
              администрации за действия покупателей.
            </p>

            {/* Section 1 */}
            <Section
              icon={FileText}
              title="1. Назначение товаров"
              items={[
                'Все товары и услуги, представленные на TEMKA.STORE, предназначены исключительно для законных целей: тестирование, маркетинг, аналитика, SMM-продвижение через официальные каналы, личное использование.',
                'Виртуальные номера предоставляются для верификации собственных аккаунтов пользователя в соответствии с правилами соответствующих сервисов.',
                'Аккаунты и цифровые товары предназначены для использования в рамках пользовательских соглашений соответствующих платформ.',
              ]}
            />

            {/* Section 2 */}
            <Section
              icon={Ban}
              title="2. Запрещённое использование"
              items={[
                'Мошенничество, фишинг, социальная инженерия и любые формы обмана третьих лиц (ст. 159 УК РФ).',
                'Незаконный доступ к компьютерной информации и взлом аккаунтов (ст. 272 УК РФ).',
                'Распространение вредоносного ПО и нарушение работы информационных систем (ст. 273–274 УК РФ).',
                'Рассылка спама и нежелательных сообщений (ФЗ «О рекламе», ст. 18).',
                'Кража, продажа или незаконная обработка персональных данных (ФЗ-152 «О персональных данных»).',
                'Легализация (отмывание) денежных средств, полученных преступным путём (ст. 174, 174.1 УК РФ).',
                'Финансирование терроризма и экстремистской деятельности (ст. 205.1 УК РФ).',
                'Любые иные действия, нарушающие законодательство Российской Федерации и международное право.',
              ]}
            />

            {/* Section 3 */}
            <Section
              icon={Scale}
              title="3. Ограничение ответственности"
              items={[
                'Администрация TEMKA.STORE не несёт ответственности за действия покупателей после приобретения товара. Вся ответственность за использование приобретённых товаров и услуг лежит на покупателе.',
                'Платформа является техническим посредником и не контролирует конечное применение проданных цифровых товаров.',
                'Согласно ст. 1253.1 ГК РФ, информационный посредник не несёт ответственности за нарушения, совершённые третьими лицами, если он не знал и не мог знать о противоправности их действий.',
                'Администрация оставляет за собой право отказать в обслуживании без объяснения причин при подозрении на противоправное использование товаров.',
              ]}
            />

            {/* Section 4 */}
            <Section
              icon={UserX}
              title="4. Обязанности покупателя"
              items={[
                'Покупатель обязуется использовать приобретённые товары и услуги исключительно в законных целях.',
                'Покупатель подтверждает, что ознакомлен с законодательством РФ в области информационных технологий и обязуется его соблюдать.',
                'Покупатель принимает на себя полную юридическую ответственность за все последствия использования приобретённых товаров.',
                'Оформляя заказ, покупатель подтверждает согласие с настоящими условиями.',
              ]}
            />

            {/* Section 5 */}
            <Section
              icon={AlertTriangle}
              title="5. Сотрудничество с правоохранительными органами"
              items={[
                'Администрация TEMKA.STORE содействует правоохранительным органам Российской Федерации в рамках действующего законодательства.',
                'При получении официального запроса от уполномоченных органов администрация предоставит всю имеющуюся информацию о пользователе и его транзакциях.',
                'Аккаунты пользователей, подозреваемых в противоправной деятельности, будут заблокированы до выяснения обстоятельств.',
              ]}
            />

            {/* Final notice */}
            <Card className="p-5 mt-8 border-destructive/30 bg-destructive/5">
              <p className="text-sm font-medium text-destructive mb-2">⚠️ Важно</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Совершая покупку на TEMKA.STORE, вы подтверждаете, что прочитали и приняли 
                все условия настоящего отказа от ответственности. Администрация не несёт 
                ответственности за любые прямые или косвенные убытки, возникшие в результате 
                использования приобретённых товаров и услуг не по назначению или с нарушением 
                законодательства РФ.
              </p>
            </Card>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Последнее обновление: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

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

export default DisclaimerPage;
