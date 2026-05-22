import { ClipboardList, MessageCircle, Users } from 'lucide-react-native';

import type { PlayerRoute } from '../../types/product';
import { BottomNav } from './BottomNav';

interface PlayerNavProps {
  active: PlayerRoute;
  onChange: (route: PlayerRoute) => void;
}

export function PlayerNav({ active, onChange }: PlayerNavProps) {
  return (
    <BottomNav
      items={[
        { route: 'check-in', label: 'TEAM', icon: Users },
        { route: 'answer', label: 'PLAY', icon: MessageCircle },
        { route: 'report', label: 'REPORT', icon: ClipboardList },
      ]}
      active={active}
      onChange={onChange}
    />
  );
}
