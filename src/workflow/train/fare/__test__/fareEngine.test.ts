import { describe, it, expect, vi, beforeEach } from 'vitest';

import { calculateFare } from '../fareEngine';
import * as pathfinder from '../pathfinder';

// Mock the pathfinder functions
vi.mock('../pathfinder', () => ({
	buildPath: vi.fn((origin: string, destination: string) => {
		if (origin === 'BL01' && destination === 'BL02') {
			return {
				cost: 17,
				pathes: [
					{
						type: 'segment',
						line: 'blue',
						from: 'BL01',
						to: 'BL02',
						stops: 1,
						stations: ['BL01', 'BL02'],
					},
				],
			};
		}
		return { cost: 0, pathes: [] };
	}),
}));

describe('fareEngine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calculates fare and path for simple blue hop', () => {
		const { fare, pathes } = calculateFare('BL01', 'BL02');
		expect(fare).toBe(17);
		expect(Array.isArray(pathes)).toBe(true);
		expect(pathes[0].type).toBe('segment');
		expect(pathfinder.buildPath).toHaveBeenCalledWith('BL01', 'BL02');
	});

	it('handles transfer between different lines', () => {
		vi.mocked(pathfinder.buildPath).mockReturnValue({
			cost: 65,
			pathes: [
				{
					type: 'segment',
					line: 'blue',
					from: 'BL01',
					to: 'BL10',
					stops: 9,
					stations: [],
				},
				{
					type: 'change',
					from: 'BL10',
					to: 'PP16',
					toLine: 'purple',
				},
				{
					type: 'segment',
					line: 'purple',
					from: 'PP16',
					to: 'PP01',
					stops: 15,
					stations: [],
				},
			],
		});

		const { fare, pathes } = calculateFare('BL01', 'PP01');
		expect(fare).toBe(65);
		expect(pathes).toHaveLength(3);
		expect(pathfinder.buildPath).toHaveBeenCalledWith('BL01', 'PP01');
	});
});
