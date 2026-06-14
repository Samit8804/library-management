import os


class SupabaseClient:
    def __init__(self, url=None, key=None):
        self.url = url or os.getenv("SUPABASE_URL")
        self.key = key or os.getenv("SUPABASE_KEY")
        self.client = None
        self._initialized = False
        if self.url and self.key:
            self._init_client()

    def _init_client(self):
        try:
            from supabase import create_client
            self.client = create_client(self.url, self.key)
            self._initialized = True
        except Exception as e:
            print(f"Supabase initialization failed: {e}")
            self._initialized = False

    def lookup_book(self, barcode):
        if not self._initialized or self.client is None:
            return {"error": "Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY env vars."}
        try:
            response = self.client.table("books").select("*").eq("isbn", barcode).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            response = self.client.table("books").select("*").eq("barcode", barcode).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            return {"error": str(e)}

    def is_ready(self):
        return self._initialized
