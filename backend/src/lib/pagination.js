// Cursor pagination by (date, _id): stable while new records arrive at the top
// (unlike offset/skip, where pages "shift").
import { z } from "zod";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errors.js";

export const PageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(200).optional(),
});

const encode = (date, id) => Buffer.from(`${date.toISOString()}|${id}`).toString("base64url");

function decode(cursor) {
  const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || !id) {
    throw new HttpError(400, "validation_error", "Invalid cursor");
  }
  return { date, id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id };
}

/**
 * A page of documents sorted by `field` descending.
 * Returns { items, nextCursor }.
 */
export async function paginate(Model, filter, { limit, cursor }, field = "createdAt") {
  const query = { ...filter };
  if (cursor) {
    const { date, id } = decode(cursor);
    query.$or = [{ [field]: { $lt: date } }, { [field]: date, _id: { $lt: id } }];
  }
  const docs = await Model.find(query).sort({ [field]: -1, _id: -1 }).limit(limit + 1);
  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const last = items.at(-1);
  return { items, nextCursor: hasMore ? encode(last[field], last._id) : null };
}
