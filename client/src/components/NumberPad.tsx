import React from 'react';
import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumberPadProps {
  onNumberPress: (number: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export default function NumberPad({ onNumberPress, onBackspace, onClear }: NumberPadProps) {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['Clear', '0', 'Delete']
  ];

  const handlePress = (value: string) => {
    if (value === 'Delete') {
      onBackspace();
    } else if (value === 'Clear') {
      onClear();
    } else {
      onNumberPress(value);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {numbers.flat().map((num) => (
        <Button
          key={num}
          variant={num === 'Clear' ? 'destructive' : num === 'Delete' ? 'outline' : 'default'}
          size="lg"
          className={`h-14 text-lg font-semibold ${
            num === 'Clear' ? 'col-span-1' : 
            num === 'Delete' ? 'col-span-1' : ''
          }`}
          onClick={() => handlePress(num)}
          data-testid={`number-pad-${num.toLowerCase()}`}
        >
          {num === 'Delete' ? (
            <Delete className="h-5 w-5" />
          ) : (
            num
          )}
        </Button>
      ))}
    </div>
  );
}