const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const products = ref({
      kickOutPlans: [],
      incomePlans: [],
      other: [],
      deposits: []
    });

    const $apiBase = `https://2ze36jo4itwg7543dk6ad5qj3e0qymvg.lambda-url.eu-west-2.on.aws/api`;
    const headers = {
      method: 'GET',
      headers: {
        'X-API-KEY': '54ca81d8-4c46-4cba-804e-ef1c65d430af'
      }
    };

    const loading = ref(false);
    const hasNextPage = ref(true);
    let cursorPointer = null;

    // Map planCategory from API to your Vue object keys
    const mapCategory = (category = '') => {
      const c = category.trim().toLowerCase();

      if (c.includes('kick')) return 'kickOutPlans';
      if (c.includes('income')) return 'incomePlans';
      if (c.includes('deposit')) return 'deposits';

      return 'other';
    };

    const fetchProducts = async (direction = '') => {
      loading.value = true;
      let nextPageParams =
        direction && cursorPointer
          ? `&nextCursorPointer=${encodeURIComponent(cursorPointer)}&direction=next`
          : '';

      try {
        const url = `${$apiBase}/plan/paginated/records?limit=50&sortBy=DESCENDING&sortByField=START_DATE&issuance=UK public offer${nextPageParams}`;
        
        const res = await fetch(url, headers);
        const data = await res.json();

        const items = data.body?.data || [];

        // SAFE PUSH INTO CATEGORIES
        items.forEach(item => {
          const key = mapCategory(item.planCategory);

          if (!products.value[key]) {
            console.warn("Unknown category:", item.planCategory, "→ mapped to:", key);
            products.value.other.push(item); // fallback
          } else {
            products.value[key].push(item);
          }
        });

        cursorPointer = data.body?.nextCursorPointer || null;
        hasNextPage.value = !!cursorPointer;
        loading.value = false;

      } catch (error) {
        console.error("Error fetching products:", error);
        loading.value = false;
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    onMounted(() => {
      fetchProducts();
    });

    return {
      products,
      loading,
      hasNextPage,
      fetchProducts,
      formatDate
    };
  }
}).mount('#app');
