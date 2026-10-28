import type { InputHTMLAttributes } from 'react';

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  allowNegative?: boolean;
}

// Поле суммы: цифровая клавиатура на телефоне, только цифры и один разделитель
export const AmountInput = ({ value, onChange, allowNegative, ...rest }: Props) => (
  <input
    type="text"
    inputMode="decimal"
    autoComplete="off"
    enterKeyHint="done"
    placeholder="0"
    {...rest}
    value={value}
    onChange={(e) => {
      const pattern = allowNegative ? /[^\d.,-]/g : /[^\d.,]/g;
      const cleaned = e.target.value.replace(pattern, '').replace('.', ',');
      // Не больше одной запятой и двух знаков после неё
      const [whole, ...fraction] = cleaned.split(',');
      onChange(
        fraction.length ? `${whole},${fraction.join('').slice(0, 2)}` : whole
      );
    }}
  />
);
