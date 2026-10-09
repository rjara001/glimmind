import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from '../../src/hooks/app/useAppHandlers';
import { useGameStore } from '../../src/store/gameStore';
import { GUEST_UID } from '../../src/constants/app';
import * as listService from '../../src/services/listService';
import type { Association, AssociationList } from '../../src/types';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();
const mockSetLastPlayedId = vi.fn();

const guestUser = {
  uid: GUEST_UID,
  displayName: 'Local Guest',
  email: null,
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff',
};

describe('useAppHandlers - Guest Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({
      user: guestUser,
      lists: [],
      currentListId: null,
      currentList: null,
      quota: null,
      isLoaded: true,
      isLoading: false,
    });
  });

  it('should create a list locally for guest users without calling remote services', async () => {
    const createListSpy = vi.spyOn(listService.listService, 'createList');

    const { result } = renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

    let listId: string | null = null;
    await act(async () => {
      listId = await result.current.handleCreateList(
        'Test Deck',
        'term / definition',
        []
      );
    });

    expect(createListSpy).not.toHaveBeenCalled();
    expect(listId).toBeTruthy();
    expect(mockShowToast).toHaveBeenCalledWith('Mazo creado', 'success');
  });

  it('should add the new list to local gameStore state', async () => {
    const { result } = renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

    const associations = [
      { id: '1', term: 'hello', definition: ['hola'], currentCycle: 1, status: 'pending' as const, isLearned: false, isArchived: false },
      { id: '2', term: 'world', definition: ['mundo'], currentCycle: 1, status: 'pending' as const, isLearned: false, isArchived: false },
    ];

    let listId: string | null = null;
    await act(async () => {
      listId = await result.current.handleCreateList(
        'My Guest Deck',
        'term / definition',
        associations
      );
    });

    const state = useGameStore.getState();
    const newList = state.lists.find((l) => l.id === listId);

    expect(newList).toBeDefined();
    expect(newList?.name).toBe('My Guest Deck');
    expect(newList?.userId).toBe(GUEST_UID);
    expect(newList?.associations).toEqual(associations);
    expect(newList?.isArchived).toBe(false);
  });

  it('should not throw errors or 401 Unauthorized for guest users', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

    let thrownError: Error | null = null;
    let createResult: string | null = null;
    try {
      await act(async () => {
        createResult = await result.current.handleCreateList('Guest Deck', 'term / definition', []);
      });
    } catch (error) {
      thrownError = error instanceof Error ? error : new Error(String(error));
    }

    expect(thrownError).toBeNull();
    expect(createResult).toBeTruthy();

    const authErrors = consoleSpy.mock.calls.filter(
      (call) => call[0]?.toString().includes('401') || call[0]?.toString().includes('Unauthorized')
    );
    expect(authErrors).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('should create list with correct default settings for guest users', async () => {
    const { result } = renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

    let listId: string | null = null;
    await act(async () => {
      listId = await result.current.handleCreateList(
        'Settings Test',
        'term / definition',
        []
      );
    });

    const state = useGameStore.getState();
    const newList = state.lists.find((l) => l.id === listId);

    expect(newList?.settings).toMatchObject({
      mode: 'training',
      flipOrder: 'normal',
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
      autoRevealAfterSeconds: 15,
      autoAdvanceAfterAttempts: 3,
    });
  });
});

describe('useAppHandlers - Guest Mode (deleteList)', () => {
  const guestList = {
    id: 'guest-list-1',
    userId: GUEST_UID,
    name: 'Guest Deck',
    concept: 'term / definition',
    associations: [],
    isArchived: false,
    settings: {
      mode: 'training' as const,
      flipOrder: 'normal' as const,
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
      autoRevealAfterSeconds: 15,
      autoAdvanceAfterAttempts: 3,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const renderHandlers = () =>
    renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      user: guestUser,
      lists: [guestList],
      currentListId: null,
      currentList: null,
      quota: null,
      isLoaded: true,
      isLoading: false,
    });
  });

  it('should not call the remote deleteList service for guest users', async () => {
    const deleteListSpy = vi.spyOn(listService.listService, 'deleteList');

    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList(guestList.id);
    });

    expect(deleteListSpy).not.toHaveBeenCalled();
  });

  it('should remove the deck from local gameStore state for guest users', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList(guestList.id);
    });

    const state = useGameStore.getState();
    expect(state.lists.find((l) => l.id === guestList.id)).toBeUndefined();
  });

  it('should show a success toast and no Unauthorized error for guest users', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList(guestList.id);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Mazo eliminado'),
      'success'
    );
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.stringContaining('Unauthorized'),
      'error'
    );
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.anything(),
      'error'
    );
  });

  it('should persist the deletion to localStorage', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList(guestList.id);
    });

    const persisted = localStorage.getItem('glimmind_lists');
    expect(persisted).not.toBeNull();
    expect(persisted).not.toContain(guestList.id);
  });

  it('should not leave isDeleting stuck when a guest deletes a deck', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList(guestList.id);
    });

    expect(result.current.isDeleting).toBe(false);
  });

  it('should still reject empty ids', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleDeleteList('');
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      'No se puede eliminar una lista sin guardar',
      'error'
    );
    expect(useGameStore.getState().lists).toHaveLength(1);
  });
});
describe('useAppHandlers - Guest Mode (handleUpdateList)', () => {
  const baseList: AssociationList = {
    id: 'guest-list-update',
    userId: GUEST_UID,
    name: 'Original Name',
    concept: 'term / definition',
    associations: [],
    isArchived: false,
    settings: {
      mode: 'training',
      flipOrder: 'normal',
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
      autoRevealAfterSeconds: 15,
      autoAdvanceAfterAttempts: 3,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const renderHandlers = () =>
    renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      user: guestUser,
      lists: [baseList],
      currentListId: null,
      currentList: null,
      quota: null,
      isLoaded: true,
      isLoading: false,
    });
  });

  it('should not call the remote updateList service for guest users', async () => {
    const updateListSpy = vi.spyOn(listService.listService, 'updateList');

    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
    });

    expect(updateListSpy).not.toHaveBeenCalled();
  });

  it('should persist the renamed deck to the local store for guest users', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
    });

    const saved = useGameStore.getState().lists.find((l) => l.id === baseList.id);
    expect(saved?.name).toBe('Renamed Deck');
  });

  it('should persist the renamed deck to localStorage for guest users', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
    });

    const persisted = localStorage.getItem('glimmind_lists');
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string)[0].name).toBe('Renamed Deck');
  });

  it('should show a success toast and no error for guest updateList', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
    });

    expect(mockShowToast).toHaveBeenCalledWith('Lista guardada', 'success');
    expect(mockShowToast).not.toHaveBeenCalledWith(
      expect.anything(),
      'error'
    );
  });

  it('should not throw ListNotFoundError for guest updateList', async () => {
    const { result } = renderHandlers();

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
      });
    } catch (error) {
      thrownError = error instanceof Error ? error : new Error(String(error));
    }

    expect(thrownError).toBeNull();
  });

  it('should not leave isUpdating stuck when a guest saves a deck', async () => {
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleUpdateList({ ...baseList, name: 'Renamed Deck' });
    });

    expect(result.current.isUpdating).toBe(false);
  });
});

describe('useAppHandlers - handleUpdateAssociations pure deletion (Fix C)', () => {
  const makeAssoc = (id: string, term: string): Association => ({
    id,
    term,
    definition: [term],
    currentCycle: 1,
    status: 'pending',
    isLearned: false,
    isArchived: false,
  });

  const cardA = makeAssoc('card-a', 'alpha');
  const cardB = makeAssoc('card-b', 'beta');
  const listId = 'list-deletion';

  const renderHandlers = () =>
    renderHook(() =>
      useAppHandlers({
        navigate: mockNavigate,
        showToast: mockShowToast,
        setLastPlayedId: mockSetLastPlayedId,
      })
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      user: guestUser,
      lists: [
        {
          id: listId,
          userId: GUEST_UID,
          name: 'Deletion Deck',
          concept: 'term / definition',
          associations: [cardA, cardB],
          isArchived: false,
          settings: {
            mode: 'training',
            flipOrder: 'normal',
            threshold: 0.95,
            ignoreArticles: true,
            showHints: true,
            autoRevealAfterSeconds: 15,
            autoAdvanceAfterAttempts: 3,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      currentListId: listId,
      currentList: null,
      quota: null,
      isLoaded: true,
      isLoading: false,
    });
  });

  it('should persist a deletion when nothing else changed', () => {
    const { result } = renderHandlers();

    act(() => {
      result.current.handleUpdateAssociations([cardA]);
    });

    const saved = useGameStore.getState().lists.find((l) => l.id === listId);
    expect(saved?.associations).toHaveLength(1);
    expect(saved?.associations[0].id).toBe('card-a');
  });

  it('should persist the deletion to localStorage', () => {
    const { result } = renderHandlers();

    act(() => {
      result.current.handleUpdateAssociations([cardA]);
    });

    const persisted = localStorage.getItem('glimmind_lists');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted as string);
    expect(parsed[0].associations).toHaveLength(1);
  });

  it('should still persist an edit when the count is unchanged', () => {
    const { result } = renderHandlers();
    const edited = { ...cardA, term: 'alpha-edited' };

    act(() => {
      result.current.handleUpdateAssociations([edited, cardB]);
    });

    const saved = useGameStore.getState().lists.find((l) => l.id === listId);
    expect(saved?.associations[0].term).toBe('alpha-edited');
  });

  it('should be a no-op when nothing changed', () => {
    const { result } = renderHandlers();
    const before = useGameStore.getState().lists.find((l) => l.id === listId);

    act(() => {
      result.current.handleUpdateAssociations([cardA, cardB]);
    });

    const after = useGameStore.getState().lists.find((l) => l.id === listId);
    expect(after?.updatedAt).toBe(before?.updatedAt);
  });
});
