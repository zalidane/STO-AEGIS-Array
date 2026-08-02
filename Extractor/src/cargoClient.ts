const API_BASE = "https://stowiki.net/w/api.php";

export async function cargoQuery(
    tables:string,
    fields:string,
    offset=0,
    limit=500
){
    const params = new URLSearchParams({
        action: "cargoquery",
        format: "json",
        tables,
        fields,
        limit: limit.toString(),
        offset: offset.toString()
    });

    const response = await fetch(`${API_BASE}?${params}`);

    if(!response.ok){
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}