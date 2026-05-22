import { ClipboardList, MessageCircle } from 'lucide-react-native';

import type { PlayerTabRoute } from '../../types/product';
import { BottomNav } from './BottomNav';

interface PlayerNavProps {
  active: PlayerTabRoute;
  onChange: (route: PlayerTabRoute) => void;
}

export function PlayerNav({ active, onChange }: PlayerNavProps) {
  return (
    <BottomNav
      items={[
        { route: 'answer', label: 'PLAY', icon: MessageCircle },
        { route: 'report', label: 'REPORT', icon: ClipboardList },
      ]}
      active={active}
      onChange={onChange}
    />
  );
}
