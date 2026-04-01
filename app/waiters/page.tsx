import { SidebarWaiter } from '@/app/components/waiters';
import WaitersSection from '@/app/components/waiters/waiters-section';

export const metadata = {
	title: 'Mesas | Vástago Meseros',
	description: 'Vista operativa para meseros en Vástago.',
};

export default function WaitersTablesPage() {
	return (
		<div className="bg-white min-h-screen overflow-x-hidden">
			<SidebarWaiter />
			<WaitersSection initialView="tables" />
		</div>
	);
}
