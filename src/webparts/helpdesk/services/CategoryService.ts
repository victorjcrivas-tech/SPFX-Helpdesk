import { SPFI } from "@pnp/sp";
import "@pnp/sp/lists";
import "@pnp/sp/items";

export interface ICategoryOption {
    key: number;
    text: string;
}

export class CategoryService {
    constructor(
        private sp: SPFI,
        private listTitle = "Categories"
    ) { }

    public async getOptions(): Promise<ICategoryOption[]> {
        const items = await this.sp.web.lists
            .getByTitle(this.listTitle)
            .items.select("Id", "Title")
            .orderBy("Title", true)
            .top(200)();

        return items.map((i: any) => ({ key: i.Id, text: i.Title }));
    }
}