import level from 'level';

const db = new level.Level<string, string>('./last_visited_block_by_chain');

export async function storeVariable(key: string, value: string): Promise<void> {
    try {
        await db.put(key, value);
    } catch (err) { console.error('Error storing variable:', err) }
}

export async function getVariable(key: string): Promise<string | null> {
    try {
        return await db.get(key);
    } catch (err) { return null };
}
