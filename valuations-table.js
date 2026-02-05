
const { createApp, ref, onMounted, watch } = Vue

createApp({
  setup() {

    const $apiBase = `https://2ze36jo4itwg7543dk6ad5qj3e0qymvg.lambda-url.eu-west-2.on.aws/api`;
    // const fileApiBAse = `https://2ze36jo4itwg7543dk6ad5qj3e0qymvg.lambda-url.eu-west-2.on.aws`;
    const fileApiBAse = `https://2ze36jo4itwg7543dk6ad5qj3e0qymvg.lambda-url.eu-west-2.on.aws/api`;
    
    const headers = {
      method: 'GET',
      headers: {
        'X-API-KEY': '54ca81d8-4c46-4cba-804e-ef1c65d430af'
      }
    }
    // const cursorPointer = `%7B%22SK%22%3A%2201K5E6A9WHBGFN70N1CTQ04XB3%22%2C%22PK%22%3A%22PLAN%22%2C%22GSI5PK%22%3A%22PLAN%23START_DATE%22%2C%22GSI5SK%22%3A%222025-07-10T16%3A00%3A00.000Z%22%7D`
    const keyword = ref('');
    const searchBy = ref('PLAN_NAME');
    const loading = ref(false);
    const open = ref('');
    const limit = ref(10);
    const products = ref([]);
    const expiredProducts = ref([]);
    const nextCursor = ref('');
    const prevCursor = ref('');
    const nextCursorExpired = ref('');
    const prevCursorExpired = ref('');
    const activeTab = ref('active-offers');

    const toggleAccordion = (product_id) => {
      open.value = (open.value === product_id) ? '' : product_id;
    }

    const endpoint = (direction, sortByField, sortOrder, hasCursor = false, isExpired = false) => {
      const searchKey = searchBy.value === 'PLAN_NAME' ? 'planName' : 'isin';
      const cursorPointer = isExpired ? (direction === 'next' ? nextCursorExpired.value : prevCursorExpired.value) : (direction === 'next' ? nextCursor.value : prevCursor.value);
      

      return `${$apiBase}/plan/paginated/records?limit=${limit.value || 10}&sortBy=${sortOrder || 'ASCENDING'}&sortByField=${sortByField}&direction=${direction || ''}&issuance=Offshore${hasCursor ? `&cursorPointer=${encodeURIComponent(cursorPointer)}` : ''}&isExpired=${isExpired}&${searchKey}=${keyword.value || '' }`;
    }

    const searchProducts = async (direction, sortByField, sortOrder, hasCursor, isExpired) => {
      loading.value = true;
      try {
        const res = await fetch(endpoint(direction, sortByField, sortOrder, hasCursor, isExpired), headers);
        const data = await res.json();

        data.body['data'].forEach(item => {
          item.hasBrochure = item.documentFlags.indexOf('brochure') !== -1;
        });

        if (isExpired) {
          expiredProducts.value = data.body?.data || [];
          nextCursorExpired.value = data.body['nextCursorPointer'];
          prevCursorExpired.value = data.body['prevCursorPointer'];
        } else {
          products.value = data.body?.data || [];
          nextCursor.value = data.body['nextCursorPointer'];
          prevCursor.value = data.body['prevCursorPointer'];
        }

        console.log(expiredProducts.value);
        

      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        loading.value = false;
      }
    }
    
    const nextPage = (isExpired) => {
      searchProducts('next', 'START_DATE', 'DESCENDING', true, isExpired);

      
    }

    const previousPage = (isExpired = false) => {
      searchProducts('prev', 'START_DATE', 'DESCENDING', true, isExpired);
    }

    const initSearch = () => {
      searchProducts('', 'START_DATE', 'DESCENDING', false, true);
      searchProducts('', 'START_DATE', 'DESCENDING', false, false);
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';

      const date = new Date(dateStr);

      // If invalid date → return the original input
      if (isNaN(date.getTime())) {
        return dateStr;
      }

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    };

    const parsePercentString = (str) => {
      if (!str || typeof str !== "string") return [];   // return empty list
        
      const matches = str.match(/-?\d+\.?\d*%/g);
      if (!matches) return [];                          // nothing matched

      return matches.map(p => ({
        display: p,
        value: parseFloat(p)
      }));
    };

    const parseUnderlying = (str) => {
      if (!str || typeof str !== "string") return [];

      return str
        .split("|")
        .map(s => s.trim())
        .filter(Boolean);   // removes empty strings like "" or "   "
    };


     const switchTab = (tab) => {
       activeTab.value = tab;

       console.log(activeTab.value);
     }

     const downloadBrochure = (planId) => {
       console.log('DOWNLOAD BROCHURE', planId);
       let doc = {};
       loading.value = true;

       const fetchKeys = async (planId) => {
        try {
          const res = await fetch (
            `${$apiBase}/document/plan/${planId}`,
              headers
          )

          const data = await res.json();
          
          doc = data.body;

          data.body.forEach ( (item) => {
            if (item.documentType == 'brochure') {
              doc = item;
            }

          } )

          downloadDoc(doc);

        } catch (error) {
          // alert('There was an error downloading the brochure. Please try again.')
        }
      }

      const downloadDoc = async (doc) => {
        console.log('→ downloadDoc called', doc);
        if (!doc?.fileDetails) {
          console.error('fileDetails missing');
          return;
        }
        console.log('→ about to fetch', `${fileApiBAse}/document/download-url?...`);
        try {
          const res = await fetch(
            `${fileApiBAse}/document/download-url?key=${doc.fileDetails.key}&mimeType=${doc.fileDetails.mimeType}&expiration=10000`,
            headers
          );
          const data = await res.json();
          window.open(data.body, '_blank');
          loading.value = false;
        } catch (err) {
          console.error('→ fetch failed', err);
          loading.value = false;
        }
      };

        fetchKeys(planId)
     }

    onMounted(() => {
      console.log('ON MOUNTED', activeTab.value)
      searchProducts('', 'START_DATE', 'DESCENDING', false, false);
      searchProducts('', 'START_DATE', 'DESCENDING', false, true);
    });

    return {
      open,
      products,
      limit,
      toggleAccordion,
      searchProducts,
      keyword,
      searchBy,
      loading,
      nextPage,
      previousPage,
      initSearch,
      formatDate,
      parsePercentString,
      parseUnderlying,
      activeTab,
      switchTab,
      expiredProducts,
      nextCursor,
      nextCursorExpired,
      prevCursor,
      prevCursorExpired,
      downloadBrochure
    }
  }
}).mount('#app')