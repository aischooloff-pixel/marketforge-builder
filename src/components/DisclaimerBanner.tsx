import { Link } from 'react-router-dom';

export const DisclaimerBanner = () => {
  return (
    <div className="bevel-sunken bg-background mx-3 sm:mx-4 mb-4 p-3 sm:p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-start gap-2">
          <span className="text-destructive text-sm shrink-0 mt-0.5">⚠</span>
          <div className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <p>
              <span className="text-foreground font-bold">ОТКАЗ ОТ ОТВЕТСТВЕННОСТИ:</span>{' '}
              Все товары предназначены исключительно для законных целей: тестирование, маркетинг, аналитика, личное использование. 
              TEMKA.STORE является продавцом цифровых товаров и не несёт ответственности за действия покупателей 
              после приобретения, за исключением случаев умысла или грубой неосторожности.
            </p>
            <p>
              Запрещено использование для мошенничества (ст. 159 УК РФ), незаконного доступа к информации (ст. 272 УК РФ), 
              распространения вредоносного ПО (ст. 273–274 УК РФ), спама (ФЗ «О рекламе», ст. 18), 
              нарушения ФЗ-152 «О персональных данных» и иных противоправных действий.
            </p>
            <p>
              Оформляя заказ, вы подтверждаете согласие с{' '}
              <Link to="/terms" className="text-primary hover:underline">[Пользовательским соглашением]</Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">[Политикой конфиденциальности]</Link>{' '}
              и принимаете полную ответственность за использование товаров.{' '}
              <Link to="/disclaimer" className="text-primary hover:underline">[Подробнее]</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
