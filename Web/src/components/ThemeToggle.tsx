import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { IconButton } from '../ui/Button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'claro' : 'oscuro';

  return (
    <IconButton
      icon={theme === 'dark' ? Sun : Moon}
      label={`Cambiar a tema ${next}`}
      variant="secondary"
      size="sm"
      onClick={toggleTheme}
    />
  );
}
