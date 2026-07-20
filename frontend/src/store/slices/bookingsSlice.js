import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingService } from '../../services/api';

const initialState = {
  myBookings: [],
  totalPages: 0,
  totalElements: 0,
  currentPage: 0,
  bookingStatus: 'idle', // 'idle' | 'processing' | 'completed' | 'failed'
  currentBookingId: null,
  error: null,
  loading: false,
  lastFetched: null, // Timestamp
};

export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMy',
  async ({ page = 0, size = 10 } = {}, { rejectWithValue, getState }) => {
    // Temporarily disabled cache for debugging
    /*
    const { lastFetched, myBookings, currentPage, totalPages } = getState().bookings;
    if (lastFetched && (Date.now() - lastFetched < 30000) && myBookings.length > 0 && currentPage === page && totalPages > 0) {
      return { content: myBookings, totalPages, totalElements: getState().bookings.totalElements, number: page };
    }
    */

    try {
      console.log(`Fetching bookings: Page ${page}, Size ${size}`);
      const response = await bookingService.getMyBookings(page, size);
      console.log('Bookings API Response:', response.data.data);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const initiateBooking = createAsyncThunk(
  'bookings/initiate',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await bookingService.book(bookingData);
      return response.data.data; // correlationId
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Booking initiation failed');
    }
  }
);

export const pollBookingStatus = createAsyncThunk(
  'bookings/pollStatus',
  async (correlationId, { rejectWithValue }) => {
    try {
      const response = await bookingService.getStatus(correlationId);
      return response.data.data; // { status, id, message }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Polling failed');
    }
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    resetBookingStatus: (state) => {
      state.bookingStatus = 'idle';
      state.currentBookingId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true;
        state.myBookings = []; // Clear old data to ensure we see fresh results
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        console.log('RTK Fulfilled Payload:', action.payload);
        state.loading = false;
        if (action.payload && action.payload.content) {
           state.myBookings = action.payload.content;
           state.totalPages = action.payload.totalPages;
           state.totalElements = action.payload.totalElements;
           state.currentPage = action.payload.pageNo;
        } else {
           state.myBookings = action.payload || [];
           state.totalPages = 1;
        }
        state.lastFetched = Date.now();
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(initiateBooking.fulfilled, (state, action) => {
        state.bookingStatus = 'processing';
        state.currentBookingId = action.payload.bookingId;
      })
      .addCase(pollBookingStatus.fulfilled, (state, action) => {
        if (action.payload.status === 'COMPLETED') {
          state.bookingStatus = 'completed';
          state.currentBookingId = action.payload.id;
        } else if (action.payload.status === 'FAILED') {
          state.bookingStatus = 'failed';
          state.error = action.payload.message;
        }
      });
  },
});

export const { resetBookingStatus } = bookingsSlice.actions;
export default bookingsSlice.reducer;
