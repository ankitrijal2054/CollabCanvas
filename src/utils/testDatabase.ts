// Database connection test utility
// Run this file to test Firebase Realtime Database connection and operations

import { ref, set, get } from "firebase/database";
import { database } from "../services/firebase";
import { canvasService } from "../services/canvasService";
import type { CanvasObject } from "../types/canvas.types";

// Test utilities interface
interface TestDatabaseUtils {
  runAll: () => Promise<void>;
  connection: () => Promise<boolean>;
  realtime: () => Promise<boolean>;
  generate: (count?: number) => Promise<number>;
  clear: () => Promise<void>;
}

/**
 * Test Firebase Realtime Database Connection
 */
export const testDatabaseConnection = async () => {
  console.log("🔥 Starting Firebase Realtime Database Tests...\n");

  try {
    // Test 1: Simple write and read
    console.log("Test 1: Simple Write & Read");
    console.log("----------------------------");
    const testRef = ref(database, "/test");
    const testData = {
      message: "Hello from CollabCanvas!",
      timestamp: Date.now(),
    };

    await set(testRef, testData);
    console.log("✅ Write successful:", testData);

    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log("✅ Read successful:", snapshot.val());
    } else {
      console.error("❌ Read failed: No data found");
    }
    console.log("");

    // Test 2: Canvas metadata initialization
    console.log("Test 2: Canvas Initialization");
    console.log("----------------------------");
    await canvasService.initializeCanvas();
    const metadata = await canvasService.getCanvasMetadata();
    console.log("✅ Canvas metadata:", metadata);
    console.log("");

    // Test 3: Create test object
    console.log("Test 3: Create Object");
    console.log("----------------------------");
    const testObject: CanvasObject = {
      id: `rect-test-${Date.now()}`,
      x: 100,
      y: 200,
      width: 150,
      height: 100,
      color: "#3B82F6",
      createdBy: "test-user",
      timestamp: Date.now(),
      type: "rectangle",
    };

    await canvasService.saveObject(testObject);
    console.log("✅ Object created:", testObject.id);
    console.log("");

    // Test 4: Read objects
    console.log("Test 4: Read Canvas State");
    console.log("----------------------------");
    const objects = await canvasService.getCanvasState();
    console.log("✅ Objects loaded:", objects.length);
    console.log("Objects:", objects);
    console.log("");

    // Test 5: Update object
    console.log("Test 5: Update Object");
    console.log("----------------------------");
    await canvasService.updateObject(testObject.id, {
      x: 250,
      y: 350,
    });
    console.log("✅ Object updated");
    console.log("");

    // Test 6: Real-time subscription
    console.log("Test 6: Real-time Subscription");
    console.log("----------------------------");
    console.log("Setting up listener...");

    const unsubscribe = canvasService.subscribeToObjects((objects) => {
      console.log("🔔 Real-time update received:", objects.length, "objects");
    });

    // Wait a bit to see real-time updates
    await new Promise((resolve) => setTimeout(resolve, 2000));
    unsubscribe();
    console.log("✅ Listener cleaned up");
    console.log("");

    // Test 7: Delete test object
    console.log("Test 7: Delete Object");
    console.log("----------------------------");
    await canvasService.deleteObject(testObject.id, "test-user");
    console.log("✅ Object deleted");
    console.log("");

    // Test 8: Verify deletion
    console.log("Test 8: Verify Deletion");
    console.log("----------------------------");
    const objectsAfterDelete = await canvasService.getCanvasState();
    console.log("✅ Objects after delete:", objectsAfterDelete.length);
    console.log("");

    console.log("🎉 All tests passed successfully!\n");
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
};

/**
 * Test real-time updates with multiple operations
 */
export const testRealtimeSync = async () => {
  console.log("🔄 Testing Real-time Sync...\n");

  try {
    let updateCount = 0;

    // Subscribe to changes
    const unsubscribe = canvasService.subscribeToObjects((objects) => {
      updateCount++;
      console.log(
        `Update #${updateCount}: ${objects.length} objects`,
        objects.map((o) => `${o.id.substring(0, 15)}...`)
      );
    });

    // Create multiple objects
    console.log("Creating 3 test objects...");
    for (let i = 0; i < 3; i++) {
      await canvasService.saveObject({
        id: `rect-sync-test-${i}-${Date.now()}`,
        type: "rectangle",
        x: 100 * i,
        y: 100 * i,
        width: 150,
        height: 100,
        color: "#3B82F6",
        createdBy: "sync-test",
        timestamp: Date.now(),
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Wait for updates
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clean up
    unsubscribe();
    console.log("\n✅ Real-time sync test completed!");
    console.log(`Received ${updateCount} updates`);

    return true;
  } catch (error) {
    console.error("❌ Real-time sync test failed:", error);
    return false;
  }
};

/**
 * Run all database tests
 */
export const runAllDatabaseTests = async () => {
  console.log("=".repeat(50));
  console.log("FIREBASE REALTIME DATABASE TEST SUITE");
  console.log("=".repeat(50));
  console.log("");

  const connectionTest = await testDatabaseConnection();

  if (connectionTest) {
    console.log("---");
    await testRealtimeSync();
  }

  console.log("");
  console.log("=".repeat(50));
  console.log("TEST SUITE COMPLETED");
  console.log("=".repeat(50));
};

/**
 * Generate many test objects efficiently (for performance testing)
 * Creates objects in a grid using batch updates to minimize writes.
 */
export const generateTestObjects = async (count: number = 500) => {
  const now = Date.now();
  const gridSize = Math.ceil(Math.sqrt(count));
  const gap = 40; // spacing between rects
  const width = 120;
  const height = 80;

  // Build updates map: objectId -> partial object record
  const updatesBatch: Record<string, Partial<CanvasObject>> = {};

  let created = 0;
  for (let i = 0; i < gridSize && created < count; i++) {
    for (let j = 0; j < gridSize && created < count; j++) {
      const id = `rect-bulk-${now}-${created}`;
      updatesBatch[id] = {
        id,
        type: "rectangle",
        x: j * (width + gap) + 20,
        y: i * (height + gap) + 20,
        width,
        height,
        color: "#3B82F6",
        createdBy: "bulk-test",
        timestamp: Date.now(),
      };
      created++;
    }
  }

  // Chunk into smaller payloads to keep requests responsive
  const ids = Object.keys(updatesBatch);
  const chunkSize = 100;
  for (let start = 0; start < ids.length; start += chunkSize) {
    const sliceIds = ids.slice(start, start + chunkSize);
    const slice: Record<string, Partial<CanvasObject>> = {};
    sliceIds.forEach((id) => (slice[id] = updatesBatch[id]));
    await canvasService.batchUpdateObjects(slice);
  }

  console.log(`✅ Generated ${created} test objects.`);
  return created;
};

/**
 * Remove all canvas objects (use carefully during tests)
 */
export const clearAllObjects = async () => {
  await canvasService.clearCanvas();
};

// Export for console testing (at the end so all functions are declared)
if (typeof window !== "undefined") {
  (
    window as unknown as Window & { testDatabase: TestDatabaseUtils }
  ).testDatabase = {
    runAll: runAllDatabaseTests,
    connection: testDatabaseConnection,
    realtime: testRealtimeSync,
    generate: generateTestObjects,
    clear: clearAllObjects,
  };
  console.log("💡 Database tests available in console:");
  console.log("   testDatabase.runAll()");
  console.log("   testDatabase.connection()");
  console.log("   testDatabase.realtime()");
  console.log("   testDatabase.generate(500)");
  console.log("   testDatabase.clear()");
}
