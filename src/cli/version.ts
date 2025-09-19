import { Command } from 'commander';
import { getVersionStatus } from '../core/version-calc';

const validFormats = ['current', 'upcoming', 'hasChanges', 'changeCount', 'status', 'json'] as const;
type OutputFormat = typeof validFormats[number];
const validFormatsString = validFormats.join(', ');

interface VersionOptions {
    output: OutputFormat;
}

export const versionCommand = new Command('version')
    .description('Get version information based on current changesets')
    .option(
        '-o, --output <format>',
        `Output format: ${validFormatsString}`,
        (value: string): OutputFormat => {

            if (!validFormats.includes(value as OutputFormat)) {
                console.error(`❌ Error: Invalid output format '${value}'`);
                console.error(`   Valid formats: ${validFormatsString}`);
                process.exit(2);
            }

            return value as OutputFormat;
        },
        'json'
    )
    .action(async (options: VersionOptions) => {
        try {
            const status = await getVersionStatus();

            switch (options.output) {
                case 'current':
                    console.log(status.current);
                    break;

                case 'upcoming':
                    console.log(status.upcoming);
                    break;

                case 'hasChanges':
                    console.log(status.hasChanges);
                    break;

                case 'changeCount':
                    console.log(status.changeCount);
                    break;

                case 'json': {
                    const jsonOutput = {
                        current: status.current,
                        upcoming: status.upcoming,
                        hasChanges: status.hasChanges,
                        changeCount: status.changeCount,
                    } satisfies Record<keyof typeof status, unknown>;
                    console.log(JSON.stringify(jsonOutput, null, 2));
                    break;
                }

                case 'status': {
                    const statusOutput = {
                        current: status.current,
                        upcoming: status.upcoming,
                        hasChanges: status.hasChanges,
                        changeCount: status.changeCount,
                    } satisfies Record<keyof typeof status, unknown>;
                    const statusString = Object.entries(statusOutput)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(' ');
                    console.log(statusString);
                    break;
                }

                default:
                    // This should never happen due to type safety
                    const _exhaustiveCheck: never = options.output;
                    console.error(`❌ Unhandled output format: ${_exhaustiveCheck}`);
                    process.exit(2);
            }
        } catch (error) {
            console.error('❌ Error getting version information:', error);
            process.exit(1);
        }
    });
